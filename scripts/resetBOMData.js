const dotenv = require('dotenv');
const { connectDatabase } = require('../utils/db');
const Sequence = require('../models/Sequence');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const { BOMMaster, BOMItem, BOMRevision, MaterialPlanning, ShortageAnalysis, MaterialReservation } = require('../models/BOMManagement');

dotenv.config();

const demoProjectName = 'SK8 Conveyor Line Upgrade';
const demoCostCenterCode = 'CC-ENG-001';
const demoSupplierCode = 'SUP-001';
const demoWarehouseCode = 'WH-001';

const bomCollections = [
  BOMMaster,
  BOMItem,
  BOMRevision,
  MaterialPlanning,
  ShortageAnalysis,
  MaterialReservation
];

const resetBomData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('Connected.');

    console.log('Clearing BOM collections...');
    await Promise.all(bomCollections.map((Model) => Model.deleteMany({})));
    await Sequence.deleteOne({ id: 'bom' });

    const project = await Project.findOne({ projectName: demoProjectName });
    if (!project) {
      throw new Error(`Project not found: ${demoProjectName}`);
    }

    const [motor, sensor, cable] = await Promise.all([
      InventoryItem.findOne({ itemCode: 'ITEM-0001' }),
      InventoryItem.findOne({ itemCode: 'ITEM-0002' }),
      InventoryItem.findOne({ itemCode: 'ITEM-0003' })
    ]);

    if (!motor || !sensor || !cable) {
      throw new Error('Required inventory items (ITEM-0001, ITEM-0002, ITEM-0003) were not found.');
    }

    const bomMaster = await new BOMMaster({
      project: demoProjectName,
      costCenter: demoCostCenterCode,
      projectStage: 'Engineering',
      drawingReference: 'DRW-SK8-CONV-002',
      revisionNumber: 'R1',
      bomTitle: 'Conveyor Drive Assembly BOM',
      bomType: 'Engineering',
      preparedBy: 'Design Engineer',
      preparedDate: new Date('2026-05-08'),
      approvedBy: 'Project Manager',
      approvalDate: new Date('2026-05-08'),
      bomStatus: 'approved',
      remarks: 'Fresh BOM reset for conveyor line upgrade'
    });

    await bomMaster.save();

    const bomNumber = bomMaster.bomNumber;
    const motorAvailable = Number(motor.openingStock || motor.currentStock || 0);
    const sensorAvailable = Number(sensor.openingStock || sensor.currentStock || 0);
    const cableAvailable = Number(cable.openingStock || cable.currentStock || 0);

    const motorRequired = 4;
    const sensorRequired = 10;
    const cableRequired = 300;

    await Promise.all([
      BOMRevision.create({
        bom: bomNumber,
        costCenter: demoCostCenterCode,
        revisionNumber: 'R1',
        revisionDate: new Date('2026-05-08'),
        revisionDescription: 'Initial engineering release',
        preparedBy: 'Design Engineer',
        approvedBy: 'Project Manager',
        revisionStatus: 'active',
        remarks: 'Fresh BOM release'
      }),
      BOMRevision.create({
        bom: bomNumber,
        costCenter: demoCostCenterCode,
        revisionNumber: 'R2',
        revisionDate: new Date('2026-05-09'),
        revisionDescription: 'Procurement ready update',
        preparedBy: 'Design Engineer',
        approvedBy: 'Project Manager',
        revisionStatus: 'active',
        remarks: 'Updated after inventory review'
      }),
      BOMItem.create({
        bom: bomNumber,
        costCenter: demoCostCenterCode,
        item: motor.itemCode,
        itemCategory: motor.itemCategory,
        itemDescription: motor.itemName,
        unit: motor.unit,
        requiredQuantity: motorRequired,
        availableStock: motorAvailable,
        reservedQuantity: 1,
        shortageQuantity: Math.max(0, motorRequired - motorAvailable),
        requiredProcurementQty: Math.max(0, motorRequired - motorAvailable),
        supplier: demoSupplierCode,
        supplierPreferred: demoSupplierCode,
        leadTime: '2 Weeks',
        priority: 'high',
        remarks: 'Main drive motor',
        status: 'active'
      }),
      BOMItem.create({
        bom: bomNumber,
        costCenter: demoCostCenterCode,
        item: sensor.itemCode,
        itemCategory: sensor.itemCategory,
        itemDescription: sensor.itemName,
        unit: sensor.unit,
        requiredQuantity: sensorRequired,
        availableStock: sensorAvailable,
        reservedQuantity: 2,
        shortageQuantity: Math.max(0, sensorRequired - sensorAvailable),
        requiredProcurementQty: Math.max(0, sensorRequired - sensorAvailable),
        supplier: demoSupplierCode,
        supplierPreferred: demoSupplierCode,
        leadTime: '1 Week',
        priority: 'medium',
        remarks: 'Position sensor for alignment',
        status: 'active'
      }),
      BOMItem.create({
        bom: bomNumber,
        costCenter: demoCostCenterCode,
        item: cable.itemCode,
        itemCategory: cable.itemCategory,
        itemDescription: cable.itemName,
        unit: cable.unit,
        requiredQuantity: cableRequired,
        availableStock: cableAvailable,
        reservedQuantity: 50,
        shortageQuantity: Math.max(0, cableRequired - cableAvailable),
        requiredProcurementQty: Math.max(0, cableRequired - cableAvailable),
        supplier: demoSupplierCode,
        supplierPreferred: demoSupplierCode,
        leadTime: '3 Days',
        priority: 'medium',
        remarks: 'Control cabling',
        status: 'active'
      }),
      MaterialPlanning.create({
        project: demoProjectName,
        costCenter: demoCostCenterCode,
        bom: bomNumber,
        planningDate: new Date('2026-05-08'),
        requiredDate: new Date('2026-05-18'),
        materialAvailabilityStatus: 'Partial',
        totalRequiredItems: 3,
        availableItems: 2,
        shortageItems: 1,
        reservedItems: 3,
        procurementRequired: true,
        planningStatus: 'pending',
        remarks: 'Planning updated after BOM refresh'
      }),
      ShortageAnalysis.create({
        project: demoProjectName,
        costCenter: demoCostCenterCode,
        bom: bomNumber,
        item: sensor.itemCode,
        requiredQuantity: sensorRequired,
        availableQuantity: sensorAvailable,
        shortageQuantity: Math.max(0, sensorRequired - sensorAvailable),
        suggestedSupplier: demoSupplierCode,
        expectedProcurementDate: new Date('2026-05-12'),
        priority: 'high',
        analysisStatus: 'completed',
        remarks: 'Procurement required for updated BOM'
      }),
      MaterialReservation.create({
        reservationNumber: 'BOM-RES-001',
        project: demoProjectName,
        costCenter: demoCostCenterCode,
        bom: bomNumber,
        task: 'BOM Allocation',
        item: cable.itemCode,
        warehouse: demoWarehouseCode,
        requiredQuantity: cableRequired,
        reservedQuantity: 250,
        reservationDate: new Date('2026-05-08'),
        requiredDate: new Date('2026-05-18'),
        reservedBy: 'Store Manager',
        reservationStatus: 'reserved',
        remarks: 'Reserved for fresh BOM execution'
      })
    ]);

    console.log(`BOM data refreshed successfully. New BOM: ${bomNumber}`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting BOM data:', err);
    process.exit(1);
  }
};

resetBomData();
