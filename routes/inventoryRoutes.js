const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');

const InventoryItem = require('../models/InventoryItem');
const Warehouse = require('../models/Warehouse');
const WarehouseLocation = require('../models/WarehouseLocation');
const StockTransaction = require('../models/StockTransaction');
const StockBalance = require('../models/StockBalance');
const StockReservation = require('../models/StockReservation');
const OpeningStock = require('../models/OpeningStock');
const StockTransfer = require('../models/StockTransfer');
const StockAdjustment = require('../models/StockAdjustment');
const logisticsModels = require('../models/Logistics');
const warehouseOpsModels = require('../models/WarehouseOperations');

const toNumber = (value) => Number(value || 0);

const getBalance = async (item, warehouse, warehouseLocation = 'unassigned') => {
    if (!item) return null;

    let balance = await StockBalance.findOne({ item, warehouse, warehouseLocation });
    if (!balance) {
        balance = new StockBalance({
            item,
            warehouse,
            warehouseLocation,
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

const applyReservationBalance = async (item, warehouse, quantityDelta) => {
    const qty = toNumber(quantityDelta);
    if (!item || !warehouse || !qty) return null;

    const balance = await getBalance(item, warehouse);
    balance.reservedStock = Math.max(0, toNumber(balance.reservedStock) + qty);
    recalculateBalance(balance);
    await balance.save();
    return balance;
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

const balanceKey = (item, warehouse) => `${item || ''}__${warehouse || ''}`;
const joinList = (values) => values.filter(Boolean).join(', ');

router.get('/balances/summary', async (req, res) => {
    try {
        const projectFilter = req.query.project || null;
        const [reservations, stockTransfers, stockIns, inventoryItems] = await Promise.all([
            projectFilter ? StockReservation.find({ project: projectFilter }) : StockReservation.find(),
            projectFilter ? StockTransfer.find({ project: projectFilter }) : StockTransfer.find(),
            warehouseOpsModels.GRNItem.find(),
            InventoryItem.find(),
        ]);

        const itemMap = new Map(inventoryItems.map((item) => [item.itemCode, item]));
        const stockInItemCodes = new Set(stockIns.map((entry) => entry.item).filter(Boolean));

        const stockInMap = new Map();
        for (const entry of stockIns) {
            const key = entry.item;
            if (!stockInMap.has(key)) {
                stockInMap.set(key, { quantity: 0, items: [] });
            }
            const current = stockInMap.get(key);
            current.quantity += toNumber(entry.receivedQuantity);
            current.items.push(entry.grn);
        }

        const reservationMap = new Map();
        for (const reservation of reservations) {
            if (!stockInItemCodes.has(reservation.item)) continue;
            const key = reservation.item;
            if (!reservationMap.has(key)) {
                reservationMap.set(key, { quantity: 0, items: [] });
            }
            const entry = reservationMap.get(key);
            entry.quantity += toNumber(reservation.reservedQuantity || reservation.requiredQuantity);
            entry.items.push(reservation.reservationNumber);
        }

        const transferMap = new Map();
        for (const transfer of stockTransfers) {
            if (!stockInItemCodes.has(transfer.item)) continue;
            const key = transfer.item;
            if (!transferMap.has(key)) {
                transferMap.set(key, { quantity: 0, items: [] });
            }
            const entry = transferMap.get(key);
            entry.quantity += toNumber(transfer.quantity);
            entry.items.push(transfer.transferNumber);
        }

        const summary = stockIns.map((entry) => {
            const itemDoc = itemMap.get(entry.item);
            const key = entry.item;
            
            // For summary, we'll group by item + warehouse + location if needed, 
            // but let's keep it item level for now but include location info
            
            return {
                item: entry.item,
                itemName: itemDoc?.itemName || entry.item,
                itemDescription: itemDoc?.description || itemDoc?.itemName || entry.item,
                unit: itemDoc?.unit || '',
                warehouse: entry.warehouse,
                warehouseLocation: entry.warehouseLocation || 'unassigned',
                stockInQty: toNumber(entry.receivedQuantity),
                availableQty: toNumber(entry.receivedQuantity), // simplified for now
                grn: entry.grn
            };
        }).sort((a, b) => String(a.itemName).localeCompare(String(b.itemName)));

        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/balances/by-location/:locationName', async (req, res) => {
    try {
        const { locationName } = req.params;
        const balances = await StockBalance.find({ 
            warehouseLocation: locationName,
            availableStock: { $gt: 0 } 
        });
        
        // Enrich with item names
        const inventoryItems = await InventoryItem.find({ 
            itemCode: { $in: balances.map(b => b.item) } 
        });
        const itemMap = new Map(inventoryItems.map(i => [i.itemCode, i.itemName]));

        const enriched = balances.map(b => ({
            item: b.item,
            itemName: itemMap.get(b.item) || b.item,
            availableQty: b.availableStock,
            warehouse: b.warehouse
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/balances/quick-add', async (req, res) => {
    try {
        const { item, warehouse, warehouseLocation, quantity, remarks } = req.body;
        const qty = toNumber(quantity);
        if (!item || !warehouse || !qty) return res.status(400).json({ message: 'Missing data' });

        const balance = await getBalance(item, warehouse, warehouseLocation || 'unassigned');
        balance.stockIn = toNumber(balance.stockIn) + qty;
        recalculateBalance(balance);
        await balance.save();

        await createStockTransaction({
            transactionType: 'QUICK_ADD',
            item,
            warehouse,
            quantity: qty,
            referenceNumber: `QA-${Date.now()}`,
            referenceType: 'Manual',
            remarks: remarks || 'Quick add from Location View'
        });

        res.json(balance);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const getBalanceForItemWarehouse = async (item, warehouse) => {
    if (!item || !warehouse) return { available: 0, balance: null };
    const balance = await StockBalance.findOne({ item, warehouse });
    return {
        balance,
        available: Math.max(0, toNumber(balance?.availableStock ?? balance?.openingStock ?? 0))
    };
};

const applyTransferBalance = async (item, warehouse, quantityDelta) => {
    const qty = toNumber(quantityDelta);
    if (!item || !warehouse || !qty) return null;

    const balance = await StockBalance.findOne({ item, warehouse }) || new StockBalance({
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

    balance.transitStock = Math.max(0, toNumber(balance.transitStock) + qty);
    balance.availableStock = Math.max(
        0,
        toNumber(balance.openingStock) + toNumber(balance.stockIn) - toNumber(balance.stockOut) - toNumber(balance.reservedStock) - toNumber(balance.transitStock)
    );
    balance.lastUpdated = new Date();
    await balance.save();
    return balance;
};

// Reservation workflow: reserve stock against the warehouse balance so dispatch can trace it later.
router.post('/reservations', async (req, res) => {
    try {
        const reservationData = req.body;
        const reservedQuantity = toNumber(reservationData.reservedQuantity || reservationData.requiredQuantity);

        const reservation = new StockReservation({
            ...reservationData,
            reservedQuantity
        });

        await reservation.save();

        if (reservation.item && reservation.warehouse && reservedQuantity > 0) {
            await applyReservationBalance(reservation.item, reservation.warehouse, reservedQuantity);
        }

        await createStockTransaction({
            transactionType: 'RESERVATION',
            item: reservation.item,
            warehouse: reservation.warehouse,
            quantity: reservedQuantity,
            referenceNumber: reservation.reservationNumber,
            referenceType: 'Reservation',
            project: reservation.project,
            remarks: reservation.remarks
        });

        res.status(201).json(reservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/transfers', async (req, res) => {
    try {
        const transferData = req.body;
        const quantity = toNumber(transferData.quantity);

        const transfer = new StockTransfer({
            ...transferData,
            quantity
        });

        await transfer.save();

        if (transfer.item && transfer.fromWarehouse && quantity > 0) {
            await applyTransferBalance(transfer.item, transfer.fromWarehouse, quantity);
        }

        await createStockTransaction({
            transactionType: 'TRANSFER_OUT',
            item: transfer.item,
            warehouse: transfer.fromWarehouse,
            quantity,
            referenceNumber: transfer.transferNumber,
            referenceType: 'Transfer',
            project: transfer.project,
            remarks: transfer.remarks
        });

        res.status(201).json(transfer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/transfers/:id', async (req, res) => {
    try {
        const existing = await StockTransfer.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        const previousQuantity = toNumber(existing.quantity);
        if (existing.item && existing.fromWarehouse && previousQuantity > 0) {
            await applyTransferBalance(existing.item, existing.fromWarehouse, -previousQuantity);
        }

        const nextQuantity = toNumber(req.body.quantity ?? existing.quantity);
        const updated = await StockTransfer.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                quantity: nextQuantity
            },
            { new: true, runValidators: true }
        );

        if (updated.item && updated.fromWarehouse && nextQuantity > 0) {
            await applyTransferBalance(updated.item, updated.fromWarehouse, nextQuantity);
        }

        await createStockTransaction({
            transactionType: 'TRANSFER_UPDATE',
            item: updated.item,
            warehouse: updated.fromWarehouse,
            quantity: nextQuantity,
            referenceNumber: updated.transferNumber,
            referenceType: 'Transfer',
            project: updated.project,
            remarks: updated.remarks
        });

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/transfers/:id', async (req, res) => {
    try {
        const transfer = await StockTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        const quantity = toNumber(transfer.quantity);
        if (transfer.item && transfer.fromWarehouse && quantity > 0) {
            await applyTransferBalance(transfer.item, transfer.fromWarehouse, -quantity);
        }

        await transfer.deleteOne();
        res.json({ message: 'Transfer deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/reservations/:id', async (req, res) => {
    try {
        const existing = await StockReservation.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const previousQuantity = toNumber(existing.reservedQuantity);
        const previousItem = existing.item;
        const previousWarehouse = existing.warehouse;

        if (previousItem && previousWarehouse && previousQuantity > 0) {
            await applyReservationBalance(previousItem, previousWarehouse, -previousQuantity);
        }

        const nextReservedQuantity = toNumber(req.body.reservedQuantity ?? req.body.requiredQuantity ?? existing.requiredQuantity);
        const updated = await StockReservation.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                reservedQuantity: nextReservedQuantity
            },
            { new: true, runValidators: true }
        );

        if (updated.item && updated.warehouse && nextReservedQuantity > 0) {
            await applyReservationBalance(updated.item, updated.warehouse, nextReservedQuantity);
        }

        await createStockTransaction({
            transactionType: 'RESERVATION-UPDATE',
            item: updated.item,
            warehouse: updated.warehouse,
            quantity: nextReservedQuantity,
            referenceNumber: updated.reservationNumber,
            referenceType: 'Reservation',
            project: updated.project,
            remarks: updated.remarks
        });

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/reservations/:id', async (req, res) => {
    try {
        const reservation = await StockReservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const reservedQuantity = toNumber(reservation.reservedQuantity);
        if (reservation.item && reservation.warehouse && reservedQuantity > 0) {
            await applyReservationBalance(reservation.item, reservation.warehouse, -reservedQuantity);
        }

        await reservation.deleteOne();
        res.json({ message: 'Reservation deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Register CRUD routes for Inventory & Warehouse
router.post('/locations', async (req, res) => {
    try {
        const locationData = req.body;
        const location = new WarehouseLocation(locationData);
        await location.save();

        // If an item and initial quantity are provided, initialize stock balance
        if (location.dedicatedItem && location.warehouse) {
            const qty = toNumber(locationData.initialQuantity);
            if (qty > 0) {
                const balance = await getBalance(location.dedicatedItem, location.warehouse, location.locationName);
                balance.stockIn = qty;
                recalculateBalance(balance);
                await balance.save();

                await createStockTransaction({
                    transactionType: 'INITIAL_STOCK',
                    item: location.dedicatedItem,
                    warehouse: location.warehouse,
                    quantity: qty,
                    referenceNumber: `LOC-INIT-${location._id}`,
                    referenceType: 'Location Init',
                    remarks: `Initial stock for dedicated location: ${location.locationName}`
                });
            }
        }

        res.status(201).json(location);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use('/items', createCrudRoutes(InventoryItem));
router.use('/warehouses', createCrudRoutes(Warehouse));
router.use('/locations', createCrudRoutes(WarehouseLocation));
router.use('/transactions', createCrudRoutes(StockTransaction));
router.use('/balances', createCrudRoutes(StockBalance));
router.use('/reservations', createCrudRoutes(StockReservation));
router.use('/opening-stock', createCrudRoutes(OpeningStock));
router.use('/transfers', createCrudRoutes(StockTransfer));
router.use('/adjustments', createCrudRoutes(StockAdjustment));

module.exports = router;
