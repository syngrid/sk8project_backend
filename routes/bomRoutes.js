const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/BOMManagement');
const { PurchaseRequest, PurchaseRequestItem } = require('../models/Procurement');
const Sequence = require('../models/Sequence');
const StockBalance = require('../models/StockBalance');

// Helper to get total available stock for an item across all warehouses
const getGlobalAvailableStock = async (itemCode) => {
    const balances = await StockBalance.find({ item: itemCode });
    return balances.reduce((sum, b) => sum + (Number(b.availableStock) || 0), 0);
};

// Real-time Shortage Analysis Report
router.get('/shortage-analysis-report', async (req, res) => {
    try {
        const bomItems = await models.BOMItem.find();
        const report = [];
        
        for (let bomItem of bomItems) {
            const available = await getGlobalAvailableStock(bomItem.item);
            const shortage = Math.max(0, bomItem.requiredQuantity - available);
            
            report.push({
                ...bomItem._doc,
                availableStock: available,
                shortageQuantity: shortage,
                status: shortage > 0 ? 'Shortage' : 'Available'
            });
        }

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 1. Check Availability
router.post('/check-availability', async (req, res) => {
    const { bomNumber } = req.body;
    try {
        const bom = await models.BOMMaster.findOne({ bomNumber });
        if (!bom) return res.status(404).json({ message: 'BOM not found' });

        const bomItems = await models.BOMItem.find({ bom: bomNumber });

        for (let bomItem of bomItems) {
            const available = await getGlobalAvailableStock(bomItem.item);
            bomItem.availableStock = available;
            bomItem.shortageQuantity = Math.max(0, bomItem.requiredQuantity - available);
            await bomItem.save();
        }

        bom.bomStatus = 'availability_checked';
        await bom.save();

        res.json({ message: 'Availability check completed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Reserve Stock
router.post('/reserve-stock', async (req, res) => {
    const { bomNumber } = req.body;
    try {
        const bom = await models.BOMMaster.findOne({ bomNumber });
        if (!bom) return res.status(404).json({ message: 'BOM not found' });

        const bomItems = await models.BOMItem.find({ bom: bomNumber });

        for (let bomItem of bomItems) {
            // Logic to reserve from StockBalance would be complex if multi-warehouse.
            // For now, we update the BOMItem and create a generic reservation record.
            const reserveQty = Math.min(bomItem.requiredQuantity, bomItem.availableStock);
            bomItem.reservedQuantity = reserveQty;
            await bomItem.save();

            if (reserveQty > 0) {
                const seq = await Sequence.findOneAndUpdate({ id: 'reservation' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
                await models.MaterialReservation.create({
                    reservationNumber: `RES-${String(seq.seq).padStart(4, '0')}`,
                    project: bom.project,
                    bom: bomNumber,
                    item: bomItem.item,
                    requiredQuantity: bomItem.requiredQuantity,
                    reservedQuantity: reserveQty,
                    reservationStatus: 'completed'
                });
                // Note: In a real system, you'd also decrement availableStock in StockBalance here.
            }
        }

        bom.bomStatus = 'stock_reserved';
        await bom.save();

        res.json({ message: 'Stock reserved' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. Identify Shortage
router.post('/identify-shortage', async (req, res) => {
    const { bomNumber } = req.body;
    try {
        const bom = await models.BOMMaster.findOne({ bomNumber });
        if (!bom) return res.status(404).json({ message: 'BOM not found' });

        const bomItems = await models.BOMItem.find({ bom: bomNumber });

        for (let bomItem of bomItems) {
            bomItem.shortageQuantity = Math.max(0, bomItem.requiredQuantity - (bomItem.reservedQuantity || 0));
            await bomItem.save();
        }

        bom.bomStatus = 'shortage_identified';
        await bom.save();

        res.json({ message: 'Shortage identified' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Generate Purchase Request
router.post('/generate-pr', async (req, res) => {
    const { bomNumber } = req.body;
    try {
        const bom = await models.BOMMaster.findOne({ bomNumber });
        if (!bom) return res.status(404).json({ message: 'BOM not found' });

        const bomItems = await models.BOMItem.find({ bom: bomNumber, shortageQuantity: { $gt: 0 } });
        if (bomItems.length === 0) return res.status(400).json({ message: 'No shortages to generate PR' });

        const seq = await Sequence.findOneAndUpdate({ id: 'pr' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        const prNumber = `PR-${String(seq.seq).padStart(4, '0')}`;

        await PurchaseRequest.create({
            prNumber,
            project: bom.project,
            bom: bomNumber,
            requestType: 'BOM',
            approvalStatus: 'Pending Approval'
        });

        for (let bomItem of bomItems) {
            await PurchaseRequestItem.create({
                purchaseRequest: prNumber,
                item: bomItem.item,
                itemDescription: bomItem.itemDescription,
                unit: bomItem.unit,
                requestedQuantity: bomItem.shortageQuantity
            });
        }

        bom.bomStatus = 'pr_generated';
        await bom.save();

        res.json({ message: `PR Generated: ${prNumber}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Consume Material
router.post('/consume-material', async (req, res) => {
    const { bomNumber } = req.body;
    try {
        const bom = await models.BOMMaster.findOne({ bomNumber });
        if (!bom) return res.status(404).json({ message: 'BOM not found' });

        const bomItems = await models.BOMItem.find({ bom: bomNumber });

        for (let bomItem of bomItems) {
            // Logic to reduce stock would go here
            // For now, we just mark as consumed
            bomItem.status = 'consumed';
            await bomItem.save();
        }

        bom.bomStatus = 'consumed';
        await bom.save();

        res.json({ message: 'Material consumed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.use('/master', createCrudRoutes(models.BOMMaster));
router.use('/items', createCrudRoutes(models.BOMItem));
router.use('/revisions', createCrudRoutes(models.BOMRevision));
router.use('/planning', createCrudRoutes(models.MaterialPlanning));
router.use('/shortage', createCrudRoutes(models.ShortageAnalysis));
router.use('/reservations', createCrudRoutes(models.MaterialReservation));

module.exports = router;
