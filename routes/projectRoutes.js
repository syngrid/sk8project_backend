const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const upload = require('../utils/upload');

const Project = require('../models/Project');
const ProjectPlanning = require('../models/ProjectPlanning');
const Task = require('../models/Task');
const Schedule = require('../models/Schedule');
const Milestone = require('../models/Milestone');
const TeamAllocation = require('../models/TeamAllocation');
const ProgressUpdate = require('../models/ProgressUpdate');
const ProjectDocument = require('../models/ProjectDocument');
const CostCenter = require('../models/CostCenter');
const { BOMMaster, BOMItem, MaterialPlanning } = require('../models/BOMManagement');
const InventoryItem = require('../models/InventoryItem');
const StockBalance = require('../models/StockBalance');
const StockReservation = require('../models/StockReservation');
const StockTransfer = require('../models/StockTransfer');
const { PurchaseRequest, PurchaseRequestItem, PurchaseOrder, PurchaseOrderItem, RFQ, SupplierQuotation } = require('../models/Procurement');
const { GRN, GRNItem, QualityCheck, StockUpdate } = require('../models/WarehouseOperations');
const { DispatchRequest, DispatchPlanning, DispatchItem, DeliveryTracking, DeliveryAcknowledgement } = require('../models/Logistics');

const syncTaskSchedule = async (task) => {
    if (!task) return;

    const scheduleData = {
        project: task.project,
        taskId: task._id,
        task: task.taskName,
        startDate: task.startDate || undefined,
        endDate: task.endDate || undefined,
        assignedResource: task.assignedTo || undefined,
        remarks: task.remarks || undefined
    };

    await Schedule.findOneAndUpdate(
        { taskId: task._id },
        { $set: scheduleData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const deleteTaskSchedule = async (taskId) => {
    if (!taskId) return;
    await Schedule.deleteOne({ taskId });
};

router.post('/projects', upload.single('attachments'), async (req, res) => {
    try {
        const projectData = { ...req.body };
        if (req.file) {
            projectData.attachments = `/uploads/${req.file.filename}`;
        }

        const project = new Project(projectData);
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/projects/:id', upload.single('attachments'), async (req, res) => {
    try {
        const projectData = { ...req.body };
        if (req.file) {
            projectData.attachments = `/uploads/${req.file.filename}`;
        }

        const project = await Project.findByIdAndUpdate(req.params.id, projectData, { new: true });
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Custom Task Update with PROJECT AUTO-PROGRESS LOGIC
router.put('/tasks/with-logic/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const updateData = req.body;
        
        const task = await Task.findByIdAndUpdate(taskId, updateData, { new: true });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await syncTaskSchedule(task);

        // Logic: If task is completed, check other tasks in the project
        if (task.taskStatus === 'completed' && task.project) {
            const allTasks = await Task.find({ project: task.project });
            const completedTasks = allTasks.filter(t => t.taskStatus === 'completed');
            
            // Calculate Project Progress %
            const progress = (completedTasks.length / allTasks.length) * 100;
            
            // Update Project Status if 100%
            if (progress === 100) {
                await Project.findOneAndUpdate(
                    { projectName: task.project }, // Using projectName as link
                    { projectStatus: 'completed' }
                );
            }
        }

        res.json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/tasks', async (req, res, next) => {
    try {
        const task = new Task(req.body);
        await task.save();
        await syncTaskSchedule(task);
        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

router.put('/tasks/:id', async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await syncTaskSchedule(task);
        res.json(task);
    } catch (err) {
        next(err);
    }
});

router.delete('/tasks/:id', async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await deleteTaskSchedule(task._id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/overview', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const bomNumberFilter = req.query.bomNumber || null;

        const projectKeys = [project.projectName, project.projectCode].filter(Boolean);
        const costCenter = project.costCenter
            ? await CostCenter.findOne({
                $or: [
                    { costCenterCode: project.costCenter },
                    { costCenterName: project.costCenter }
                ]
            })
            : null;
        const costCenterKeys = costCenter
            ? [costCenter.costCenterCode, costCenter.costCenterName].filter(Boolean)
            : (project.costCenter ? [project.costCenter] : []);

        const planning = await ProjectPlanning.find({ project: { $in: projectKeys } });
        const tasks = await Task.find({ project: { $in: projectKeys } });
        const schedules = await Schedule.find({ project: { $in: projectKeys } });
        const milestones = await Milestone.find({ project: { $in: projectKeys } });
        const allocations = await TeamAllocation.find({ project: { $in: projectKeys } });
        const progressUpdates = await ProgressUpdate.find({ project: { $in: projectKeys } });
        const projectDocuments = await ProjectDocument.find({ project: { $in: projectKeys } });

        const bomMastersAll = await BOMMaster.find({ project: { $in: projectKeys } });
        const bomMasters = bomNumberFilter
            ? bomMastersAll.filter((bom) => bom.bomNumber === bomNumberFilter)
            : bomMastersAll;
        const bomIds = bomMasters.map((bom) => bom.bomNumber);
        const bomItems = bomIds.length > 0
            ? await BOMItem.find({ bom: { $in: bomIds } })
            : [];
        const materialPlanning = await MaterialPlanning.find({ project: { $in: projectKeys } });
        const bomReservations = bomIds.length > 0
            ? await StockReservation.find({ project: { $in: projectKeys }, bom: { $in: bomIds } })
            : [];
        const bomTransfers = bomIds.length > 0
            ? await StockTransfer.find({ project: { $in: projectKeys }, bom: { $in: bomIds } })
            : [];

        const inventoryItems = await InventoryItem.find();
        const bomItemCodes = [...new Set(bomItems.map((item) => item.item).filter(Boolean))];
        const stockBalances = bomItemCodes.length > 0
            ? await StockBalance.find({ item: { $in: bomItemCodes } })
            : [];
        const reservationMap = new Map();
        for (const reservation of bomReservations) {
            const key = reservation.item;
            if (!reservationMap.has(key)) {
                reservationMap.set(key, { quantity: 0, records: [] });
            }
            const entry = reservationMap.get(key);
            entry.quantity += Number(reservation.reservedQuantity || reservation.requiredQuantity || 0);
            entry.records.push(reservation.reservationNumber);
        }

        const transferMap = new Map();
        for (const transfer of bomTransfers) {
            const key = transfer.item;
            if (!transferMap.has(key)) {
                transferMap.set(key, { quantity: 0, records: [] });
            }
            const entry = transferMap.get(key);
            entry.quantity += Number(transfer.quantity || 0);
            entry.records.push(transfer.transferNumber);
        }

        const bomAvailability = bomItems.map((bomItem) => {
            const stock = inventoryItems.find((item) => item.itemCode === bomItem.item);
            const balances = stockBalances.filter((balance) => balance.item === bomItem.item);
            const availableStock = balances.length > 0
                ? balances.reduce((sum, balance) => sum + (balance.availableStock ?? 0), 0)
                : (stock ? stock.openingStock || 0 : 0);
            const shortageQuantity = Math.max(0, (bomItem.requiredQuantity || 0) - availableStock);
            const reservedQuantity = reservationMap.get(bomItem.item)?.quantity || 0;
            const transferQuantity = transferMap.get(bomItem.item)?.quantity || 0;

            return {
                item: bomItem.item,
                requiredQuantity: bomItem.requiredQuantity || 0,
                availableStock,
                reservedQuantity,
                shortageQuantity,
                transferQuantity,
                status: shortageQuantity > 0 ? 'Shortage' : 'Available'
            };
        });

        const procurementRequests = await PurchaseRequest.find({ project: { $in: projectKeys } });
        const purchaseOrders = await PurchaseOrder.find({ project: { $in: projectKeys } });
        const purchaseRequestItems = costCenterKeys.length > 0
            ? await PurchaseRequestItem.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const purchaseOrderItems = costCenterKeys.length > 0
            ? await PurchaseOrderItem.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const rfqs = costCenterKeys.length > 0
            ? await RFQ.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const quotations = costCenterKeys.length > 0
            ? await SupplierQuotation.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const grns = costCenterKeys.length > 0
            ? await GRN.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const grnItems = costCenterKeys.length > 0
            ? await GRNItem.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const qualityChecks = costCenterKeys.length > 0
            ? await QualityCheck.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const stockUpdates = costCenterKeys.length > 0
            ? await StockUpdate.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const dispatchRequests = await DispatchRequest.find({ project: { $in: projectKeys } });
        const dispatchPlanning = await DispatchPlanning.find({ project: { $in: projectKeys } });
        const dispatchItems = costCenterKeys.length > 0
            ? await DispatchItem.find({ costCenter: { $in: costCenterKeys } })
            : [];
        const deliveryTracking = await DeliveryTracking.find({ dispatch: { $in: dispatchPlanning.map((d) => d.dispatchNumber) } });
        const deliveryAcknowledgements = await DeliveryAcknowledgement.find({ dispatch: { $in: dispatchPlanning.map((d) => d.dispatchNumber) } });
        const costCenterSummary = costCenter ? {
            costCenter,
            purchaseRequestItems,
            purchaseOrderItems,
            rfqs,
            quotations,
            grns,
            grnItems,
            qualityChecks,
            stockUpdates,
            dispatchItems,
            totals: {
                totalPRItems: purchaseRequestItems.length,
                totalPOItems: purchaseOrderItems.length,
                totalRFQs: rfqs.length,
                totalQuotations: quotations.length,
                totalGRNs: grns.length,
                totalGRNItems: grnItems.length,
                totalQC: qualityChecks.length,
                totalStockUpdates: stockUpdates.length,
                totalDispatchItems: dispatchItems.length,
                totalPOValue: purchaseOrderItems.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0)
            }
        } : null;

        const overview = {
            project,
            costCenter,
            costCenterSummary,
            planning,
            tasks,
            schedules,
            milestones,
            allocations,
            progressUpdates,
            documents: projectDocuments,
            bom: {
                masters: bomMasters,
                items: bomItems,
                materialPlanning,
                reservations: bomReservations,
                transfers: bomTransfers,
                availability: bomAvailability,
                summary: {
                    totalItems: bomItems.length,
                    shortageItems: bomAvailability.filter((item) => item.shortageQuantity > 0).length,
                    reservedItems: bomReservations.length,
                    transferredItems: bomTransfers.length
                }
            },
            procurement: {
                purchaseRequests: procurementRequests,
                purchaseOrders,
                summary: {
                    totalRequests: procurementRequests.length,
                    totalOrders: purchaseOrders.length,
                    pendingRequests: procurementRequests.filter((request) => request.approvalStatus !== 'approved').length
                }
            },
            logistics: {
                dispatchRequests,
                dispatchPlanning,
                deliveryTracking,
                deliveryAcknowledgements,
                summary: {
                    totalDispatchRequests: dispatchRequests.length,
                    totalDispatchPlans: dispatchPlanning.length,
                    delivered: deliveryAcknowledgements.length
                }
            }
        };

        res.json(overview);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.use('/projects', createCrudRoutes(Project));
router.use('/planning', createCrudRoutes(ProjectPlanning));
router.use('/tasks', createCrudRoutes(Task));
router.use('/schedules', createCrudRoutes(Schedule));
router.use('/milestones', createCrudRoutes(Milestone));
router.use('/allocations', createCrudRoutes(TeamAllocation));
router.use('/updates', createCrudRoutes(ProgressUpdate));
router.use('/documents', createCrudRoutes(ProjectDocument));

module.exports = router;
