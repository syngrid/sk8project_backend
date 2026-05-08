const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/Logistics');
const InventoryItem = require('../models/InventoryItem');
const StockTransaction = require('../models/StockTransaction');
const StockReservation = require('../models/StockReservation');
const StockBalance = require('../models/StockBalance');

const toNumber = (value) => Number(value || 0);

const getBalance = async (item, warehouse) => {
    if (!item || !warehouse) return null;

    let balance = await StockBalance.findOne({ item, warehouse });
    if (!balance) {
        balance = new StockBalance({
            item,
            warehouse,
            openingStock: 0,
            stockIn: 0,
            stockOut: 0,
            reservedStock: 0,
            transitStock: 0,
            availableStock: 0,
            lastUpdated: new Date(),
            status: 'active'
        });
    }

    return balance;
};

const recalculateBalance = (balance) => {
    balance.availableStock = Math.max(
        0,
        toNumber(balance.openingStock) + toNumber(balance.stockIn) - toNumber(balance.stockOut) - toNumber(balance.reservedStock) - toNumber(balance.transitStock)
    );
    balance.lastUpdated = new Date();
    return balance;
};

const saveBalance = async (item, warehouse, deltaReserved = 0, deltaTransit = 0, deltaStockOut = 0, deltaStockIn = 0) => {
    if (!item || !warehouse) return null;

    const balance = await getBalance(item, warehouse);
    balance.reservedStock = Math.max(0, toNumber(balance.reservedStock) + toNumber(deltaReserved));
    balance.transitStock = Math.max(0, toNumber(balance.transitStock) + toNumber(deltaTransit));
    balance.stockOut = Math.max(0, toNumber(balance.stockOut) + toNumber(deltaStockOut));
    balance.stockIn = Math.max(0, toNumber(balance.stockIn) + toNumber(deltaStockIn));
    recalculateBalance(balance);
    await balance.save();
    return balance;
};

const saveInventoryCurrentStock = async (itemCode, delta) => {
    if (!itemCode || !delta) return;

    const invItem = await InventoryItem.findOne({ itemCode });
    if (!invItem) return;

    invItem.currentStock = Math.max(0, toNumber(invItem.currentStock) + toNumber(delta));
    await invItem.save();
};

const adjustReservationQuantity = async (reservationNumber, delta, statusOverride = null) => {
    if (!reservationNumber || !delta) return null;

    const reservation = await loadReservation(reservationNumber);
    if (!reservation) return null;

    reservation.reservedQuantity = Math.max(0, toNumber(reservation.reservedQuantity) + toNumber(delta));
    reservation.status = statusOverride || (reservation.reservedQuantity > 0 ? 'pending' : 'fulfilled');
    await reservation.save();
    return reservation;
};

const createStockTransaction = async ({ transactionType, item, warehouse, quantity, referenceNumber, referenceType, project, remarks }) => {
    const transaction = new StockTransaction({
        transactionNumber: `${transactionType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        transactionType,
        item,
        warehouse,
        quantity,
        referenceNumber,
        referenceType,
        project,
        remarks,
        status: 'completed'
    });

    await transaction.save();
    return transaction;
};

const loadReservation = async (reservationNumber) => {
    if (!reservationNumber) return null;
    return StockReservation.findOne({ reservationNumber });
};

router.get('/requests/summary', async (req, res) => {
    try {
        const [requests, items] = await Promise.all([
            models.DispatchRequest.find().sort({ createdAt: -1 }),
            models.DispatchItem.find()
        ]);

        const itemMap = items.reduce((acc, item) => {
            if (!acc[item.dispatch]) acc[item.dispatch] = [];
            acc[item.dispatch].push(item);
            return acc;
        }, {});

        const summary = requests.map((request) => {
            const requestItems = itemMap[request.dispatchRequestNumber] || [];
            const totalQuantity = requestItems.reduce((sum, item) => sum + toNumber(item.dispatchQuantity), 0);
            const requestItemSummary = request.itemDescription || request.item || 'No item selected';
            const requestQuantity = toNumber(request.quantity);
            const itemLabels = requestItems.map((item) => {
                const parts = [
                    item.itemDescription || item.item,
                    item.dispatchQuantity ? `${item.dispatchQuantity} ${item.unit || ''}`.trim() : null
                ].filter(Boolean);
                return parts.join(' - ');
            });

            return {
                ...request.toObject(),
                transitItems: requestItems,
                transitItemCount: requestItems.length,
                transitQuantity: totalQuantity,
                transitSummary: itemLabels.length
                    ? itemLabels.join(', ')
                    : `${requestItemSummary}${requestQuantity ? ` - ${requestQuantity} ${request.unit || ''}`.trim() : ''}`
            };
        });

        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/requests', async (req, res) => {
    try {
        const itemData = req.body;
        const invItem = itemData.item ? await InventoryItem.findOne({ itemCode: itemData.item }) : null;

        const request = new models.DispatchRequest({
            ...itemData,
            itemDescription: itemData.itemDescription || invItem?.itemName,
            unit: itemData.unit || invItem?.unit,
            quantity: toNumber(itemData.quantity)
        });

        await request.save();
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/requests/:id', async (req, res) => {
    try {
        const existing = await models.DispatchRequest.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Transit request not found' });
        }

        const merged = {
            ...existing.toObject(),
            ...req.body
        };
        const invItem = merged.item ? await InventoryItem.findOne({ itemCode: merged.item }) : null;
        merged.itemDescription = merged.itemDescription || invItem?.itemName;
        merged.unit = merged.unit || invItem?.unit;
        merged.quantity = toNumber(merged.quantity);

        const updated = await models.DispatchRequest.findByIdAndUpdate(req.params.id, merged, {
            new: true,
            runValidators: true
        });

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const applyReservationEffect = async (reservation, quantityDelta) => {
    if (!reservation || !reservation.item || !reservation.warehouse) return;
    await saveBalance(reservation.item, reservation.warehouse, quantityDelta, 0, 0, 0);
};

const applyDispatchEffect = async (dispatchDoc, quantityMultiplier = 1) => {
    if (!dispatchDoc || !dispatchDoc.item) return;

    const qty = toNumber(dispatchDoc.dispatchQuantity) * quantityMultiplier;
    if (!qty) return;

    const reservation = dispatchDoc.reservationNumber ? await loadReservation(dispatchDoc.reservationNumber) : null;
    const warehouse = dispatchDoc.warehouse || reservation?.warehouse;

    if (warehouse) {
        await saveBalance(
            dispatchDoc.item,
            warehouse,
            -qty,
            qty,
            qty,
            0
        );
    }

    await saveInventoryCurrentStock(dispatchDoc.item, -qty);
};

const reverseDispatchEffect = async (dispatchDoc) => {
    if (!dispatchDoc || !dispatchDoc.item) return;

    const qty = toNumber(dispatchDoc.dispatchQuantity);
    if (!qty) return;

    const reservation = dispatchDoc.reservationNumber ? await loadReservation(dispatchDoc.reservationNumber) : null;
    const warehouse = dispatchDoc.warehouse || reservation?.warehouse;

    if (warehouse) {
        await saveBalance(
            dispatchDoc.item,
            warehouse,
            qty,
            -qty,
            -qty,
            0
        );
    }

    await saveInventoryCurrentStock(dispatchDoc.item, qty);
};

const validateDispatchReservation = async (payload) => {
    const reservationNumber = payload.reservationNumber;
    const dispatchQuantity = toNumber(payload.dispatchQuantity);

    if (!reservationNumber) {
        throw new Error('Reservation number is required');
    }

    if (!dispatchQuantity || dispatchQuantity <= 0) {
        throw new Error('Dispatch quantity must be greater than 0');
    }

    const reservation = await loadReservation(reservationNumber);
    if (!reservation) {
        throw new Error(`Reservation ${reservationNumber} not found`);
    }

    if (reservation.status === 'cancelled') {
        throw new Error(`Reservation ${reservationNumber} is cancelled`);
    }

    if (reservation.item !== payload.item) {
        throw new Error(`Reservation ${reservationNumber} is linked to ${reservation.item}, not ${payload.item}`);
    }

    if (toNumber(reservation.reservedQuantity) < dispatchQuantity) {
        throw new Error(`Reservation ${reservationNumber} has only ${reservation.reservedQuantity} qty available`);
    }

    return reservation;
};

// Dispatch item create/update/delete with reservation -> transit linkage.
router.post('/items', async (req, res) => {
    let dispatchItem = null;
    let reservation = null;
    let warehouse = null;
    let dispatchQuantity = 0;
    let project = null;
    let reservationConsumed = false;
    let balanceAdjusted = false;
    let stockAdjusted = false;
    try {
        const itemData = req.body;
        reservation = await validateDispatchReservation(itemData);
        const dispatchRequest = itemData.dispatch
            ? await models.DispatchRequest.findOne({ dispatchRequestNumber: itemData.dispatch })
            : null;
        warehouse = itemData.warehouse || reservation.warehouse;
        dispatchQuantity = toNumber(itemData.dispatchQuantity);
        project = itemData.project || dispatchRequest?.project || reservation.project;

        dispatchItem = new models.DispatchItem({
            ...itemData,
            project,
            warehouse,
            reservedQuantity: toNumber(itemData.reservedQuantity || dispatchQuantity)
        });

        await dispatchItem.save();

        await adjustReservationQuantity(reservation.reservationNumber, -dispatchQuantity);
        reservationConsumed = true;

        await saveBalance(
            dispatchItem.item,
            warehouse,
            -dispatchQuantity,
            dispatchQuantity,
            dispatchQuantity,
            0
        );
        balanceAdjusted = true;

        await saveInventoryCurrentStock(dispatchItem.item, -dispatchQuantity);
        stockAdjusted = true;

        await createStockTransaction({
            transactionType: 'DISPATCH',
            item: dispatchItem.item,
            warehouse,
            quantity: dispatchQuantity,
            referenceNumber: dispatchItem.dispatch,
            referenceType: 'Dispatch',
            project,
            remarks: `Linked to reservation ${reservation.reservationNumber}`
        });

        res.status(201).json(dispatchItem);
    } catch (err) {
        try {
            if (stockAdjusted) {
                await saveInventoryCurrentStock(dispatchItem?.item || req.body.item, dispatchQuantity);
            }
            if (balanceAdjusted && dispatchItem?.item && warehouse) {
                await saveBalance(dispatchItem.item, warehouse, dispatchQuantity, -dispatchQuantity, -dispatchQuantity, 0);
            }
            if (reservationConsumed && reservation) {
                await adjustReservationQuantity(reservation.reservationNumber, dispatchQuantity);
            }
            if (dispatchItem?._id) {
                await dispatchItem.deleteOne();
            }
        } catch (rollbackErr) {
            console.error('Dispatch create rollback failed:', rollbackErr);
        }
        res.status(400).json({ message: err.message });
    }
});

router.put('/items/:id', async (req, res) => {
    let previous = null;
    let merged = null;
    let reservation = null;
    let oldEffectsReversed = false;
    let oldReservationRestored = false;
    let newReservationConsumed = false;
    let newEffectsApplied = false;
    let updatedDoc = null;
    try {
        const existing = await models.DispatchItem.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Dispatch item not found' });
        }

        previous = existing.toObject();
        merged = {
            ...previous,
            ...req.body,
            warehouse: req.body.warehouse || previous.warehouse
        };

        reservation = await validateDispatchReservation(merged);
        const dispatchRequest = merged.dispatch
            ? await models.DispatchRequest.findOne({ dispatchRequestNumber: merged.dispatch })
            : null;
        merged.project = merged.project || dispatchRequest?.project || reservation.project;
        merged.warehouse = merged.warehouse || reservation.warehouse;
        merged.reservedQuantity = toNumber(merged.reservedQuantity || merged.dispatchQuantity);

        if (previous.reservationNumber) {
            await adjustReservationQuantity(previous.reservationNumber, toNumber(previous.dispatchQuantity));
            oldReservationRestored = true;
        }
        await reverseDispatchEffect(previous);
        oldEffectsReversed = true;

        updatedDoc = await models.DispatchItem.findByIdAndUpdate(
            req.params.id,
            merged,
            { new: true, runValidators: true }
        );

        await adjustReservationQuantity(reservation.reservationNumber, -toNumber(updatedDoc.dispatchQuantity));
        newReservationConsumed = true;
        await applyDispatchEffect(updatedDoc);
        newEffectsApplied = true;

        await createStockTransaction({
            transactionType: 'DISPATCH-UPDATE',
            item: updatedDoc.item,
            warehouse: updatedDoc.warehouse,
            quantity: toNumber(updatedDoc.dispatchQuantity),
            referenceNumber: updatedDoc.dispatch,
            referenceType: 'Dispatch',
            project: updatedDoc.project,
            remarks: `Updated dispatch linked to reservation ${updatedDoc.reservationNumber}`
        });

        res.json(updatedDoc);
    } catch (err) {
        try {
            if (newEffectsApplied && merged) {
                    await reverseDispatchEffect(merged);
            }
            if (newReservationConsumed && reservation) {
                await adjustReservationQuantity(reservation.reservationNumber, toNumber(merged.dispatchQuantity));
            }
            if (updatedDoc && previous) {
                await models.DispatchItem.findByIdAndUpdate(req.params.id, previous, { new: true, runValidators: true });
            }
            if (oldEffectsReversed && previous) {
                await applyDispatchEffect(previous);
            }
            if (oldReservationRestored && previous?.reservationNumber) {
                await adjustReservationQuantity(previous.reservationNumber, -toNumber(previous.dispatchQuantity));
            }
        } catch (rollbackErr) {
            console.error('Dispatch update rollback failed:', rollbackErr);
        }
        res.status(400).json({ message: err.message });
    }
});

router.delete('/items/:id', async (req, res) => {
    try {
        const existing = await models.DispatchItem.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Dispatch item not found' });
        }

        const previous = existing.toObject();
        await reverseDispatchEffect(previous);

        if (previous.reservationNumber) {
            await adjustReservationQuantity(previous.reservationNumber, toNumber(previous.dispatchQuantity), 'pending');
        }

        await existing.deleteOne();
        res.json({ message: 'Dispatch item deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use('/requests', createCrudRoutes(models.DispatchRequest));
router.use('/planning', createCrudRoutes(models.DispatchPlanning));
router.use('/items', createCrudRoutes(models.DispatchItem));
router.use('/tracking', createCrudRoutes(models.DeliveryTracking));
router.use('/acknowledgements', createCrudRoutes(models.DeliveryAcknowledgement));

module.exports = router;
