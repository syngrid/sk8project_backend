const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/WarehouseOperations');
const InventoryItem = require('../models/InventoryItem');
const StockBalance = require('../models/StockBalance');
const { PurchaseOrder } = require('../models/Procurement');
const StockTransaction = require('../models/StockTransaction');

const toNumber = (value) => Number(value || 0);
const makeTransactionNumber = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getBalance = async (item, warehouse, warehouseLocation = 'unassigned') => {
    if (!item || !warehouse) return null;

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

const adjustInventoryStock = async (itemCode, delta) => {
    if (!itemCode || !delta) return;

    const invItem = await InventoryItem.findOne({ itemCode });
    if (!invItem) return;

    invItem.currentStock = Math.max(0, toNumber(invItem.currentStock) + toNumber(delta));
    await invItem.save();
};

const adjustStockBalance = async (item, warehouse, warehouseLocation, quantityDelta) => {
    if (!item || !warehouse) return null;

    const balance = await getBalance(item, warehouse, warehouseLocation || 'unassigned');
    balance.stockIn = Math.max(0, toNumber(balance.stockIn) + toNumber(quantityDelta));
    recalculateBalance(balance);
    await balance.save();
    return balance;
};

const resolveWarehouse = (itemData) => itemData.warehouse || itemData.warehouseLocation || 'Central';

const applyGrnEffect = async (itemData, previous = null) => {
    const itemCode = itemData?.item;
    const warehouse = resolveWarehouse(itemData);
    const quantity = toNumber(itemData?.receivedQuantity);

    const previousQuantity = previous ? toNumber(previous.receivedQuantity) : 0;
    const previousWarehouse = previous ? resolveWarehouse(previous) : null;

    if (previous && previousQuantity) {
        await adjustInventoryStock(previous.item, -previousQuantity);
        await adjustStockBalance(previous.item, previous.warehouse, previous.warehouseLocation, -previousQuantity);
    }

    if (!itemCode || !warehouse || !quantity) return;

    await adjustInventoryStock(itemCode, quantity);
    await adjustStockBalance(itemCode, warehouse, itemData.warehouseLocation, quantity);
};

router.get('/grn-items', async (req, res) => {
    try {
        const [grnItems, inventoryItems] = await Promise.all([
            models.GRNItem.find().sort({ createdAt: -1 }),
            InventoryItem.find()
        ]);

        const inventoryMap = new Map(
            inventoryItems.map((item) => [item.itemCode, item])
        );

        const enriched = grnItems.map((grnItem) => {
            const invItem = inventoryMap.get(grnItem.item);
            return {
                ...grnItem.toObject(),
                itemDescription: grnItem.itemDescription || invItem?.itemName || grnItem.item,
                itemCategory: grnItem.itemCategory || invItem?.itemCategory || '',
                unit: grnItem.unit || invItem?.unit || ''
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Custom GRN Item logic with STRICT APPROVAL GATING
router.post('/grn-items/with-logic', async (req, res) => {
    try {
        const itemData = req.body;

        // --- STRICT GATING ---
        // Check if the related Purchase Order is APPROVED
        if (itemData.purchaseOrder) {
            const po = await PurchaseOrder.findOne({ poNumber: itemData.purchaseOrder });
            if (!po) {
                return res.status(400).json({ message: 'Purchase Order not found' });
            }
            if (po.approvalStatus !== 'approved') {
                return res.status(403).json({ message: `Access Denied: PO ${itemData.purchaseOrder} is not yet approved.` });
            }
        }

        const invItem = await InventoryItem.findOne({ itemCode: itemData.item });
        const grnItem = new models.GRNItem({
            ...itemData,
            itemDescription: itemData.itemDescription || invItem?.itemName,
            itemCategory: itemData.itemCategory || invItem?.itemCategory,
            unit: itemData.unit || invItem?.unit,
            warehouse: resolveWarehouse(itemData)
        });
        await grnItem.save();

        await applyGrnEffect(grnItem.toObject());

        // Create Stock Transaction
        const transaction = new StockTransaction({
            transactionNumber: makeTransactionNumber('GRN'),
            item: itemData.item,
            transactionType: 'INWARD',
            quantity: itemData.receivedQuantity,
            referenceNumber: itemData.grn,
            referenceType: 'GRN',
            warehouse: resolveWarehouse(itemData)
        });
        await transaction.save();

        // --- PROCUREMENT INTEGRATION ---
        // Update PO Item Received Quantity
        const { PurchaseOrderItem, PurchaseOrder: POMaster } = require('../models/Procurement');
        const poItem = await PurchaseOrderItem.findOne({ 
            purchaseOrder: itemData.purchaseOrder, 
            item: itemData.item 
        });

        if (poItem) {
            poItem.receivedQuantity = (poItem.receivedQuantity || 0) + toNumber(itemData.receivedQuantity);
            poItem.pendingQuantity = Math.max(0, poItem.orderedQuantity - poItem.receivedQuantity);
            await poItem.save();

            // Check PO Status
            const allItems = await PurchaseOrderItem.find({ purchaseOrder: itemData.purchaseOrder });
            const totalOrdered = allItems.reduce((sum, i) => sum + i.orderedQuantity, 0);
            const totalReceived = allItems.reduce((sum, i) => sum + i.receivedQuantity, 0);

            const po = await POMaster.findOne({ poNumber: itemData.purchaseOrder });
            if (po) {
                if (totalReceived >= totalOrdered) {
                    po.poStatus = 'Completed';
                } else if (totalReceived > 0) {
                    po.poStatus = 'Partial Delivery';
                }
                await po.save();
            }
        }

        res.status(201).json(grnItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/grn-items/:id', async (req, res) => {
    try {
        const existing = await models.GRNItem.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'GRN item not found' });
        }

        const previous = existing.toObject();
        const merged = {
            ...previous,
            ...req.body,
            warehouse: req.body.warehouse || req.body.warehouseLocation || previous.warehouse || previous.warehouseLocation || 'Central'
        };

        const invItem = await InventoryItem.findOne({ itemCode: merged.item });
        merged.itemDescription = merged.itemDescription || invItem?.itemName;
        merged.itemCategory = merged.itemCategory || invItem?.itemCategory;
        merged.unit = merged.unit || invItem?.unit;

        const updated = await models.GRNItem.findByIdAndUpdate(req.params.id, merged, {
            new: true,
            runValidators: true
        });

        await applyGrnEffect(updated.toObject(), previous);

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/grn-items/:id', async (req, res) => {
    try {
        const existing = await models.GRNItem.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'GRN item not found' });
        }

        const previous = existing.toObject();
        const quantity = toNumber(previous.receivedQuantity);
        const warehouse = resolveWarehouse(previous);

        if (previous.item && warehouse && quantity) {
            await adjustInventoryStock(previous.item, -quantity);
            await adjustStockBalance(previous.item, previous.warehouse, previous.warehouseLocation, -quantity);
        }

        await existing.deleteOne();
        res.json({ message: 'GRN item deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use('/grn', createCrudRoutes(models.GRN));
router.use('/grn-items', createCrudRoutes(models.GRNItem));
router.use('/qc', createCrudRoutes(models.QualityCheck));
router.use('/stock-updates', createCrudRoutes(models.StockUpdate));

module.exports = router;
