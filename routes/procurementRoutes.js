const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/Procurement');

// Custom PO Creation with PR GATING
router.post('/po/with-logic', async (req, res) => {
    try {
        const poData = req.body;
        
        // If PO is linked to a PR, check PR status
        if (poData.purchaseRequest) {
            const pr = await models.PurchaseRequest.findOne({ prNumber: poData.purchaseRequest });
            if (pr && pr.approvalStatus !== 'approved') {
                return res.status(403).json({ message: `Access Denied: PR ${poData.purchaseRequest} must be approved before raising a PO.` });
            }
        }

        const po = new models.PurchaseOrder(poData);
        await po.save();
        res.status(201).json(po);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use('/pr', createCrudRoutes(models.PurchaseRequest));
router.use('/pr-items', createCrudRoutes(models.PurchaseRequestItem));
router.use('/approvals', createCrudRoutes(models.PurchaseApproval));
router.use('/approval-history', createCrudRoutes(models.ApprovalHistory));
router.use('/po', createCrudRoutes(models.PurchaseOrder));
router.use('/po-items', createCrudRoutes(models.PurchaseOrderItem));

// Custom PR Approval Logic with History
router.post('/pr/:id/approve', async (req, res) => {
    try {
        const pr = await models.PurchaseRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        pr.approvalStatus = 'Approved';
        await pr.save();

        // Create approval transaction record
        const txn = new models.PurchaseApproval({
            prReference: pr.prNumber,
            project: pr.project,
            approvalStatus: 'Approved',
            approvalDate: new Date(),
            comments: req.body.comments,
            approver: req.body.approver || 'Admin'
        });
        await txn.save();

        // Create History Log
        const history = new models.ApprovalHistory({
            prReference: pr.prNumber,
            action: 'Approved',
            actor: req.body.approver || 'Admin',
            comments: req.body.comments
        });
        await history.save();

        res.json({ message: 'PR Approved', pr });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/pr/:id/reject', async (req, res) => {
    try {
        const pr = await models.PurchaseRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        pr.approvalStatus = 'Rejected';
        await pr.save();

        const txn = new models.PurchaseApproval({
            prReference: pr.prNumber,
            project: pr.project,
            approvalStatus: 'Rejected',
            approvalDate: new Date(),
            comments: req.body.comments,
            approver: req.body.approver || 'Admin'
        });
        await txn.save();

        // Create History Log
        const history = new models.ApprovalHistory({
            prReference: pr.prNumber,
            action: 'Rejected',
            actor: req.body.approver || 'Admin',
            comments: req.body.comments
        });
        await history.save();

        res.json({ message: 'PR Rejected', pr });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/pr/:id/send-back', async (req, res) => {
    try {
        const pr = await models.PurchaseRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ message: 'PR not found' });

        pr.approvalStatus = 'Draft'; // Send back to draft for editing
        await pr.save();

        const history = new models.ApprovalHistory({
            prReference: pr.prNumber,
            action: 'Sent Back',
            actor: req.body.approver || 'Admin',
            comments: req.body.comments
        });
        await history.save();

        res.json({ message: 'PR Sent Back for Revision', pr });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Custom PO Creation with Logic
router.post('/po/with-logic', async (req, res) => {
    try {
        const poData = req.body;
        
        if (poData.prReference) {
            const pr = await models.PurchaseRequest.findOne({ prNumber: poData.prReference });
            if (!pr || pr.approvalStatus !== 'Approved') {
                return res.status(403).json({ message: `Access Denied: PR ${poData.prReference} must be approved.` });
            }
            
            // Mark PR as PO Created
            pr.approvalStatus = 'PO Created';
            await pr.save();
        }

        const po = new models.PurchaseOrder({
            ...poData,
            poStatus: 'Draft'
        });
        await po.save();

        // If items are provided, calculate total and create them
        if (poData.items && poData.items.length > 0) {
            let total = 0;
            const prNumber = poData.prReference;
            
            for (let item of poData.items) {
                // Validate against PR if reference exists
                if (prNumber) {
                    const prItem = await models.PurchaseRequestItem.findOne({ 
                        purchaseRequest: prNumber, 
                        item: item.item 
                    });
                    if (prItem && item.orderedQuantity > prItem.requestedQuantity) {
                        return res.status(400).json({ 
                            message: `Quantity for ${item.item} exceeds approved PR quantity (${prItem.requestedQuantity})` 
                        });
                    }
                }

                const amount = (item.orderedQuantity * item.unitPrice) + (item.tax || 0);
                total += amount;
                await models.PurchaseOrderItem.create({
                    ...item,
                    purchaseOrder: po.poNumber,
                    totalAmount: amount,
                    pendingQuantity: item.orderedQuantity
                });
            }
            po.totalAmount = total;
            await po.save();
        }

        res.status(201).json(po);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
