const dotenv = require('dotenv');
const { connectDatabase } = require('../utils/db');

const Project = require('../models/Project');
const CostCenter = require('../models/CostCenter');
const Warehouse = require('../models/Warehouse');
const WarehouseLocation = require('../models/WarehouseLocation');
const Department = require('../models/Department');
const Role = require('../models/Role');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const Unit = require('../models/Unit');
const InventoryItem = require('../models/InventoryItem');
const StockBalance = require('../models/StockBalance');
const StockTransaction = require('../models/StockTransaction');
const StockReservation = require('../models/StockReservation');
const OpeningStock = require('../models/OpeningStock');
const StockTransfer = require('../models/StockTransfer');
const StockAdjustment = require('../models/StockAdjustment');
const ProjectPlanning = require('../models/ProjectPlanning');
const Task = require('../models/Task');
const Schedule = require('../models/Schedule');
const Milestone = require('../models/Milestone');
const TeamAllocation = require('../models/TeamAllocation');
const ProgressUpdate = require('../models/ProgressUpdate');
const ProjectDocument = require('../models/ProjectDocument');
const { BOMMaster, BOMItem, BOMRevision, MaterialPlanning, ShortageAnalysis, MaterialReservation } = require('../models/BOMManagement');
const { PurchaseRequest, PurchaseRequestItem, RFQ, SupplierQuotation, PurchaseOrder, PurchaseOrderItem } = require('../models/Procurement');
const { ApprovalWorkflow, ApprovalLevel, ApprovalTransaction } = require('../models/ApprovalWorkflow');
const { GRN, GRNItem, QualityCheck, StockUpdate } = require('../models/WarehouseOperations');
const { DispatchRequest, DispatchPlanning, DispatchItem, DeliveryTracking, DeliveryAcknowledgement } = require('../models/Logistics');
const { Folder, Doc, DocVersion, DocAccessLog } = require('../models/DocManagement');

dotenv.config();

const demoProjectName = 'SK8 Conveyor Line Upgrade';
const demoProjectCode = 'PRJ-DEM-001';
const demoCostCenterCode = 'CC-ENG-001';
const demoWarehouseCode = 'WH-001';
const demoSiteWarehouseCode = 'WH-002';
const demoSupplierCode = 'SUP-001';

async function upsertOne(Model, query, data) {
    return Model.findOneAndUpdate(query, data, {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true
    });
}

async function seedUser(query, data) {
    const existing = await User.findOne(query);
    if (existing) {
        await User.findByIdAndUpdate(existing._id, {
            $set: {
                employeeId: data.employeeId,
                firstName: data.firstName,
                lastName: data.lastName,
                mobileNumber: data.mobileNumber,
                role: data.role,
                department: data.department,
                designation: data.designation,
                status: data.status,
                profileImage: data.profileImage,
                address: data.address,
                remarks: data.remarks
            }
        });
        return User.findById(existing._id);
    }

    const user = new User(data);
    await user.save();
    return user;
}

async function seedDemoData() {
    await connectDatabase();

    const [project, costCenter, warehouse, category, supplier] = await Promise.all([
        upsertOne(Project, { projectCode: demoProjectCode }, {
            projectCode: demoProjectCode,
            projectName: demoProjectName,
            clientName: 'SK8 Engineering Demo Client',
            projectType: 'Industrial Conveyor Upgrade',
            department: 'Projects',
            projectManager: 'Vignesh Kumar',
            costCenter: demoCostCenterCode,
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-08-15'),
            priority: 'high',
            budget: 2500000,
            costCenter: demoCostCenterCode,
            siteLocation: 'Chennai Plant - Line 2',
            projectStatus: 'active',
            description: 'Demo project used to show end-to-end PMS flow across planning, BOM, procurement, logistics, and documents.'
        }),
        upsertOne(CostCenter, { costCenterCode: demoCostCenterCode }, {
            costCenterName: 'Engineering Project Cost Center',
            costCenterCode: demoCostCenterCode,
            department: 'Projects',
            budgetAmount: 2500000,
            currency: 'INR',
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-12-31'),
            description: 'Cost center for demo conveyor upgrade project',
            status: 'active'
        }),
        upsertOne(Warehouse, { warehouseCode: demoWarehouseCode }, {
            warehouseName: 'Central Engineering Warehouse',
            warehouseCode: demoWarehouseCode,
            warehouseType: 'main',
            contactPerson: 'Store Incharge',
            phoneNumber: '9000000001',
            email: 'warehouse@sk8.example',
            address: 'Industrial Estate, Chennai',
            country: 'India',
            state: 'Tamil Nadu',
            city: 'Chennai',
            postalCode: '600001',
            storageCapacity: '5000 sq.ft',
            status: 'active',
            remarks: 'Primary warehouse for demo stock flow'
        }),
        upsertOne(Category, { categoryName: 'Electrical' }, {
            categoryName: 'Electrical',
            categoryCode: 'CAT-EL-001',
            description: 'Electrical components'
        }),
        upsertOne(Supplier, { supplierCode: demoSupplierCode }, {
            supplierName: 'Alpha Industrial Supplies',
            supplierCode: demoSupplierCode,
            supplierType: 'OEM',
            companyRegNumber: 'CIN-DEMO-001',
            contactPerson: 'Arun',
            mobileNumber: '9880000001',
            officeNumber: '044-40000001',
            email: 'sales@alphaindustrial.example',
            website: 'https://alphaindustrial.example',
            address: 'Sidco Industrial Area, Chennai',
            country: 'India',
            state: 'Tamil Nadu',
            city: 'Chennai',
            postalCode: '600058',
            paymentTerms: '30 Days',
            currency: 'INR',
            taxNumber: 'GST-DEMO-001',
            bankName: 'Demo Bank',
            bankAccountNumber: '123456789012',
            swiftCode: 'DEMOINBB',
            preferredSupplier: true,
            supplierRating: 5,
            remarks: 'Preferred supplier for conveyor electrical items',
            status: 'active'
        })
    ]);

    const siteWarehouse = await upsertOne(Warehouse, { warehouseCode: demoSiteWarehouseCode }, {
        warehouseName: 'Site Warehouse',
        warehouseCode: demoSiteWarehouseCode,
        warehouseType: 'site',
        contactPerson: 'Site Store',
        phoneNumber: '9000000010',
        email: 'sitewarehouse@sk8.example',
        address: 'ABC Manufacturing Singapore - Site Store',
        country: 'Singapore',
        state: 'Singapore',
        city: 'Singapore',
        postalCode: '238801',
        storageCapacity: '2000 sq.ft',
        status: 'active',
        remarks: 'Material staging warehouse at site'
    });

    const departments = await Promise.all([
        upsertOne(Department, { departmentCode: 'DEP-001' }, { departmentName: 'Engineering', departmentCode: 'DEP-001', status: 'active' }),
        upsertOne(Department, { departmentCode: 'DEP-002' }, { departmentName: 'Procurement', departmentCode: 'DEP-002', status: 'active' }),
        upsertOne(Department, { departmentCode: 'DEP-003' }, { departmentName: 'Logistics', departmentCode: 'DEP-003', status: 'active' }),
        upsertOne(Department, { departmentCode: 'DEP-004' }, { departmentName: 'Warehouse', departmentCode: 'DEP-004', status: 'active' }),
        upsertOne(Department, { departmentCode: 'DEP-005' }, { departmentName: 'Accounts', departmentCode: 'DEP-005', status: 'active' })
    ]);

    const roles = await Promise.all([
        upsertOne(Role, { roleCode: 'ROL-001' }, {
            roleName: 'Project Manager',
            roleCode: 'ROL-001',
            description: 'Manages project execution and approvals',
            permissions: ['projects', 'planning', 'tasks', 'dashboard'],
            status: 'active'
        }),
        upsertOne(Role, { roleCode: 'ROL-002' }, {
            roleName: 'Design Engineer',
            roleCode: 'ROL-002',
            description: 'Handles planning and BOM creation',
            permissions: ['planning', 'bom', 'docs'],
            status: 'active'
        }),
        upsertOne(Role, { roleCode: 'ROL-003' }, {
            roleName: 'Procurement Executive',
            roleCode: 'ROL-003',
            description: 'Handles PR, RFQ and PO',
            permissions: ['procurement', 'approvals'],
            status: 'active'
        }),
        upsertOne(Role, { roleCode: 'ROL-004' }, {
            roleName: 'Store Incharge',
            roleCode: 'ROL-004',
            description: 'Responsible for inventory and warehouse ops',
            permissions: ['inventory', 'grn', 'qc', 'stock'],
            status: 'active'
        }),
        upsertOne(Role, { roleCode: 'ROL-005' }, {
            roleName: 'Site Engineer',
            roleCode: 'ROL-005',
            description: 'Handles site execution and dispatch receipt',
            permissions: ['logistics', 'progress', 'docs'],
            status: 'active'
        })
    ]);

    const units = await Promise.all([
        upsertOne(Unit, { unitCode: 'UNT-001' }, { unitName: 'Numbers', unitCode: 'UNT-001', unitType: 'Count', decimalAllowed: false, description: 'Numbers', status: 'active' }),
        upsertOne(Unit, { unitCode: 'UNT-002' }, { unitName: 'Kilograms', unitCode: 'UNT-002', unitType: 'Weight', decimalAllowed: true, description: 'Kilograms', status: 'active' }),
        upsertOne(Unit, { unitCode: 'UNT-003' }, { unitName: 'Meters', unitCode: 'UNT-003', unitType: 'Length', decimalAllowed: true, description: 'Meters', status: 'active' }),
        upsertOne(Unit, { unitCode: 'UNT-004' }, { unitName: 'Boxes', unitCode: 'UNT-004', unitType: 'Pack', decimalAllowed: false, description: 'Box pack', status: 'active' }),
        upsertOne(Unit, { unitCode: 'UNT-005' }, { unitName: 'Lots', unitCode: 'UNT-005', unitType: 'Batch', decimalAllowed: false, description: 'Lot/batch', status: 'active' })
    ]);

    const categories = await Promise.all([
        upsertOne(Category, { categoryCode: 'CAT-001' }, { categoryName: 'Electrical', categoryCode: 'CAT-001', categoryType: 'Material', description: 'Electrical items', status: 'active' }),
        upsertOne(Category, { categoryCode: 'CAT-002' }, { categoryName: 'Mechanical', categoryCode: 'CAT-002', categoryType: 'Material', description: 'Mechanical items', status: 'active' }),
        upsertOne(Category, { categoryCode: 'CAT-003' }, { categoryName: 'Structural', categoryCode: 'CAT-003', categoryType: 'Material', description: 'Steel and structural items', status: 'active' }),
        upsertOne(Category, { categoryCode: 'CAT-004' }, { categoryName: 'Consumables', categoryCode: 'CAT-004', categoryType: 'Material', description: 'Consumable items', status: 'active' }),
        upsertOne(Category, { categoryCode: 'CAT-005' }, { categoryName: 'Documents', categoryCode: 'CAT-005', categoryType: 'Master', description: 'Document types', status: 'active' })
    ]);

    const extraSuppliers = await Promise.all([
        upsertOne(Supplier, { supplierCode: 'SUP-002' }, {
            supplierName: 'Delta Motors',
            supplierCode: 'SUP-002',
            supplierType: 'OEM',
            contactPerson: 'Ravi',
            mobileNumber: '9880000002',
            email: 'sales@deltamotors.example',
            address: 'Ambattur, Chennai',
            country: 'India',
            state: 'Tamil Nadu',
            city: 'Chennai',
            postalCode: '600053',
            paymentTerms: '15 Days',
            currency: 'INR',
            preferredSupplier: true,
            supplierRating: 5,
            status: 'active'
        }),
        upsertOne(Supplier, { supplierCode: 'SUP-003' }, {
            supplierName: 'Omron Control Systems',
            supplierCode: 'SUP-003',
            supplierType: 'Distributor',
            contactPerson: 'Suresh',
            mobileNumber: '9880000003',
            email: 'sales@omroncs.example',
            address: 'Bangalore',
            country: 'India',
            state: 'Karnataka',
            city: 'Bengaluru',
            postalCode: '560001',
            paymentTerms: '30 Days',
            currency: 'INR',
            preferredSupplier: false,
            supplierRating: 4,
            status: 'active'
        }),
        upsertOne(Supplier, { supplierCode: 'SUP-004' }, {
            supplierName: 'SteelTech Traders',
            supplierCode: 'SUP-004',
            supplierType: 'Trader',
            contactPerson: 'Kumar',
            mobileNumber: '9880000004',
            email: 'sales@steeltech.example',
            address: 'Coimbatore',
            country: 'India',
            state: 'Tamil Nadu',
            city: 'Coimbatore',
            postalCode: '641001',
            paymentTerms: '20 Days',
            currency: 'INR',
            preferredSupplier: false,
            supplierRating: 4,
            status: 'active'
        }),
        upsertOne(Supplier, { supplierCode: 'SUP-005' }, {
            supplierName: 'CablePro Industries',
            supplierCode: 'SUP-005',
            supplierType: 'Manufacturer',
            contactPerson: 'Naveen',
            mobileNumber: '9880000005',
            email: 'sales@cablepro.example',
            address: 'Sriperumbudur',
            country: 'India',
            state: 'Tamil Nadu',
            city: 'Chennai',
            postalCode: '602105',
            paymentTerms: '30 Days',
            currency: 'INR',
            preferredSupplier: false,
            supplierRating: 4,
            status: 'active'
        })
    ]);

    const users = await Promise.all([
        seedUser({ email: 'pm@sk8.demo' }, {
            employeeId: 'EMP-001',
            firstName: 'Vignesh',
            lastName: 'Kumar',
            email: 'pm@sk8.demo',
            mobileNumber: '9000000001',
            password: 'Test@123',
            role: roles[0].roleName,
            department: departments[0].departmentName,
            designation: 'Project Manager',
            status: 'active',
            address: 'Chennai',
            remarks: 'Demo project manager'
        }),
        seedUser({ email: 'design@sk8.demo' }, {
            employeeId: 'EMP-002',
            firstName: 'Arun',
            lastName: 'Kumar',
            email: 'design@sk8.demo',
            mobileNumber: '9000000002',
            password: 'Test@123',
            role: roles[1].roleName,
            department: departments[0].departmentName,
            designation: 'Design Engineer',
            status: 'active',
            address: 'Chennai',
            remarks: 'Demo design engineer'
        }),
        seedUser({ email: 'procurement@sk8.demo' }, {
            employeeId: 'EMP-003',
            firstName: 'Priya',
            lastName: 'S',
            email: 'procurement@sk8.demo',
            mobileNumber: '9000000003',
            password: 'Test@123',
            role: roles[2].roleName,
            department: departments[1].departmentName,
            designation: 'Procurement Executive',
            status: 'active',
            address: 'Chennai',
            remarks: 'Demo procurement executive'
        }),
        seedUser({ email: 'store@sk8.demo' }, {
            employeeId: 'EMP-004',
            firstName: 'Ramesh',
            lastName: 'B',
            email: 'store@sk8.demo',
            mobileNumber: '9000000004',
            password: 'Test@123',
            role: roles[3].roleName,
            department: departments[3].departmentName,
            designation: 'Store Incharge',
            status: 'active',
            address: 'Chennai',
            remarks: 'Demo store owner'
        }),
        seedUser({ email: 'site@sk8.demo' }, {
            employeeId: 'EMP-005',
            firstName: 'Suresh',
            lastName: 'M',
            email: 'site@sk8.demo',
            mobileNumber: '9000000005',
            password: 'Test@123',
            role: roles[4].roleName,
            department: departments[2].departmentName,
            designation: 'Site Engineer',
            status: 'active',
            address: 'Site location',
            remarks: 'Demo site engineer'
        })
    ]);

    const location = await upsertOne(WarehouseLocation, { warehouse: demoWarehouseCode, locationName: 'Aisle A / Rack 1' }, {
        warehouse: demoWarehouseCode,
        locationName: 'Aisle A / Rack 1',
        rackNumber: 'R1',
        shelfNumber: 'S1',
        binNumber: 'B1',
        capacity: '1000 units',
        status: 'active',
        remarks: 'Main electrical component bin'
    });

    const motor = await upsertOne(InventoryItem, { itemCode: 'ITEM-0001' }, {
        itemCode: 'ITEM-0001',
        itemName: '3 HP IE3 Motor',
        itemCategory: 'Electrical',
        subCategory: 'Motor',
        unit: 'Numbers',
        itemType: 'Finished Good',
        brand: 'ABB',
        modelNumber: 'M-3HP-IE3',
        partNumber: 'MTR-3HP-01',
        barcode: 'MTR3001',
        minimumStock: 2,
        maximumStock: 12,
        reorderLevel: 3,
        openingStock: 6,
        openingStockValue: 420000,
        warehouse: demoWarehouseCode,
        supplier: demoSupplierCode,
        itemCost: 70000,
        currency: 'INR',
        skuCode: 'SKU-MOTOR-001',
        description: 'Main drive motor for conveyor',
        status: 'active'
    });

    const sensor = await upsertOne(InventoryItem, { itemCode: 'ITEM-0002' }, {
        itemCode: 'ITEM-0002',
        itemName: 'Proximity Sensor',
        itemCategory: 'Electrical',
        subCategory: 'Sensor',
        unit: 'Numbers',
        itemType: 'Component',
        brand: 'Omron',
        modelNumber: 'E2E-X5',
        partNumber: 'SEN-PRX-01',
        barcode: 'SNS2002',
        minimumStock: 10,
        maximumStock: 50,
        reorderLevel: 12,
        openingStock: 18,
        openingStockValue: 54000,
        warehouse: demoWarehouseCode,
        supplier: demoSupplierCode,
        itemCost: 3000,
        currency: 'INR',
        skuCode: 'SKU-SENSOR-001',
        description: 'Belt position sensor',
        status: 'active'
    });

    const cable = await upsertOne(InventoryItem, { itemCode: 'ITEM-0003' }, {
        itemCode: 'ITEM-0003',
        itemName: 'Control Cable 4 Core',
        itemCategory: 'Electrical',
        subCategory: 'Cable',
        unit: 'Meters',
        itemType: 'Consumable',
        brand: 'Polycab',
        modelNumber: '4C-2.5SQ',
        partNumber: 'CBL-4C-01',
        barcode: 'CBL4003',
        minimumStock: 100,
        maximumStock: 1000,
        reorderLevel: 150,
        openingStock: 500,
        openingStockValue: 75000,
        warehouse: demoWarehouseCode,
        supplier: demoSupplierCode,
        itemCost: 150,
        currency: 'INR',
        skuCode: 'SKU-CABLE-001',
        description: 'Control cable for panel wiring',
        status: 'active'
    });

    await Promise.all([
        upsertOne(StockBalance, { item: motor.itemCode, warehouse: demoWarehouseCode }, {
            item: motor.itemCode,
            warehouse: demoWarehouseCode,
            openingStock: 6,
            stockIn: 0,
            stockOut: 0,
            reservedStock: 1,
            transitStock: 0,
            availableStock: 5,
            lastUpdated: new Date(),
            status: 'active'
        }),
        upsertOne(StockBalance, { item: sensor.itemCode, warehouse: demoWarehouseCode }, {
            item: sensor.itemCode,
            warehouse: demoWarehouseCode,
            openingStock: 18,
            stockIn: 0,
            stockOut: 0,
            reservedStock: 2,
            transitStock: 0,
            availableStock: 16,
            lastUpdated: new Date(),
            status: 'active'
        }),
        upsertOne(StockBalance, { item: cable.itemCode, warehouse: demoWarehouseCode }, {
            item: cable.itemCode,
            warehouse: demoWarehouseCode,
            openingStock: 500,
            stockIn: 0,
            stockOut: 250,
            reservedStock: 0,
            transitStock: 250,
            availableStock: 250,
            lastUpdated: new Date(),
            status: 'active'
        })
    ]);

    await Promise.all([
        upsertOne(OpeningStock, { item: motor.itemCode, warehouse: demoWarehouseCode }, {
            item: motor.itemCode,
            warehouse: demoWarehouseCode,
            openingQuantity: 6,
            openingValue: 420000,
            unitCost: 70000,
            openingDate: new Date('2026-05-01'),
            remarks: 'Initial stock for motors',
            status: 'active'
        }),
        upsertOne(OpeningStock, { item: sensor.itemCode, warehouse: demoWarehouseCode }, {
            item: sensor.itemCode,
            warehouse: demoWarehouseCode,
            openingQuantity: 18,
            openingValue: 54000,
            unitCost: 3000,
            openingDate: new Date('2026-05-01'),
            remarks: 'Initial stock for sensors',
            status: 'active'
        }),
        upsertOne(StockReservation, { reservationNumber: 'SRV-001' }, {
            reservationNumber: 'SRV-001',
            project: demoProjectName,
            task: 'Dispatch to Site',
            item: cable.itemCode,
            warehouse: demoWarehouseCode,
            requiredQuantity: 250,
            reservedQuantity: 0,
            reservationDate: new Date('2026-05-12'),
            requiredDate: new Date('2026-05-18'),
            reservedBy: 'Store Manager',
            status: 'fulfilled',
            remarks: 'Reserved and dispatched to site'
        }),
        upsertOne(StockTransaction, { transactionNumber: 'STX-001' }, {
            transactionNumber: 'STX-001',
            transactionType: 'INWARD',
            transactionDate: new Date('2026-05-14'),
            item: motor.itemCode,
            warehouse: demoWarehouseCode,
            location: location.locationName,
            quantity: 2,
            unit: motor.unit,
            referenceNumber: 'GRN-001',
            referenceType: 'GRN',
            project: demoProjectName,
            remarks: 'Goods received into stock',
            createdBy: 'Store Keeper',
            status: 'completed'
        }),
        upsertOne(StockTransfer, { transferNumber: 'TRF-001' }, {
            transferNumber: 'TRF-001',
            fromWarehouse: demoWarehouseCode,
            toWarehouse: demoSiteWarehouseCode,
            transferDate: new Date('2026-05-18'),
            item: cable.itemCode,
            quantity: 250,
            transferReason: 'Dispatch to site warehouse',
            approvedBy: 'Project Manager',
            transferStatus: 'completed',
            remarks: 'Staged for site execution'
        }),
        upsertOne(StockAdjustment, { adjustmentNumber: 'ADJ-001' }, {
            adjustmentNumber: 'ADJ-001',
            warehouse: demoWarehouseCode,
            item: sensor.itemCode,
            adjustmentType: 'addition',
            quantity: 2,
            reason: 'Physical count correction',
            approvedBy: 'Store Manager',
            adjustmentDate: new Date('2026-05-15'),
            remarks: 'Count variance corrected',
            status: 'approved'
        })
    ]);

    await Promise.all([
        upsertOne(ProjectPlanning, { project: demoProjectName, planningTitle: 'Project Kickoff' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            planningTitle: 'Project Kickoff',
            planningStage: 'Planning',
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-05-05'),
            estimatedCost: 150000,
            estimatedHours: 40,
            resourceRequirement: 'Project Manager, Design Engineer',
            remarks: 'Initial scope finalization',
            status: 'active'
        }),
        upsertOne(ProjectPlanning, { project: demoProjectName, planningTitle: 'Execution Planning' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            planningTitle: 'Execution Planning',
            planningStage: 'Execution',
            startDate: new Date('2026-05-06'),
            endDate: new Date('2026-05-12'),
            estimatedCost: 350000,
            estimatedHours: 96,
            resourceRequirement: 'Store, Procurement, Site Team',
            remarks: 'Planning BOM and logistics',
            status: 'active'
        }),
        upsertOne(Task, { project: demoProjectName, taskName: 'Prepare BOQ and BOM' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            stage: 'Planning',
            taskName: 'Prepare BOQ and BOM',
            taskCode: 'TASK-001',
            assignedTo: 'Design Engineer',
            priority: 'high',
            startDate: new Date('2026-05-02'),
            endDate: new Date('2026-05-04'),
            estimatedHours: 24,
            dependencyTask: '',
            progressPercentage: 100,
            taskStatus: 'completed',
            remarks: 'BOM approved',
            attachments: '/uploads/demo-bom.pdf'
        }),
        upsertOne(Task, { project: demoProjectName, taskName: 'Procure Critical Items' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            stage: 'Procurement',
            taskName: 'Procure Critical Items',
            taskCode: 'TASK-002',
            assignedTo: 'Procurement Lead',
            priority: 'high',
            startDate: new Date('2026-05-06'),
            endDate: new Date('2026-05-15'),
            estimatedHours: 40,
            dependencyTask: 'TASK-001',
            progressPercentage: 65,
            taskStatus: 'in-progress',
            remarks: 'Waiting on PO delivery',
            attachments: ''
        }),
        upsertOne(Task, { project: demoProjectName, taskName: 'Dispatch to Site' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            stage: 'Logistics',
            taskName: 'Dispatch to Site',
            taskCode: 'TASK-003',
            assignedTo: 'Logistics Coordinator',
            priority: 'medium',
            startDate: new Date('2026-05-18'),
            endDate: new Date('2026-05-20'),
            estimatedHours: 16,
            dependencyTask: 'TASK-002',
            progressPercentage: 0,
            taskStatus: 'pending',
            remarks: 'Awaiting material receipt',
            attachments: ''
        }),
        upsertOne(Schedule, { project: demoProjectName, task: 'Prepare BOQ and BOM' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            task: 'Prepare BOQ and BOM',
            startDate: new Date('2026-05-02'),
            endDate: new Date('2026-05-04'),
            assignedResource: 'Design Team',
            remarks: 'Schedule aligned to kickoff'
        }),
        upsertOne(Schedule, { project: demoProjectName, task: 'Dispatch to Site' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            task: 'Dispatch to Site',
            startDate: new Date('2026-05-18'),
            endDate: new Date('2026-05-20'),
            assignedResource: 'Logistics Team',
            remarks: 'Planned after GRN'
        }),
        upsertOne(Milestone, { project: demoProjectName, milestoneName: 'BOM Approved' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            milestoneName: 'BOM Approved',
            description: 'Engineering signoff completed',
            targetDate: new Date('2026-05-04'),
            completionDate: new Date('2026-05-04'),
            responsiblePerson: 'Design Lead',
            priority: 'high',
            status: 'completed',
            remarks: 'BOM released for procurement'
        }),
        upsertOne(Milestone, { project: demoProjectName, milestoneName: 'Material Delivered to Site' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            milestoneName: 'Material Delivered to Site',
            description: 'Critical items received at site',
            targetDate: new Date('2026-05-21'),
            completionDate: null,
            responsiblePerson: 'Logistics Lead',
            priority: 'medium',
            status: 'pending',
            remarks: 'Will complete after dispatch'
        }),
        upsertOne(TeamAllocation, { project: demoProjectName, employee: 'Vignesh Kumar' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            employee: 'Vignesh Kumar',
            role: 'Project Manager',
            department: 'Projects',
            allocationStartDate: new Date('2026-05-01'),
            allocationEndDate: new Date('2026-08-15'),
            workingHours: 8,
            allocationPercentage: 50,
            remarks: 'Owns the overall execution',
            status: 'active'
        }),
        upsertOne(TeamAllocation, { project: demoProjectName, employee: 'Arun Kumar' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            employee: 'Arun Kumar',
            role: 'Procurement Lead',
            department: 'Procurement',
            allocationStartDate: new Date('2026-05-06'),
            allocationEndDate: new Date('2026-06-15'),
            workingHours: 8,
            allocationPercentage: 60,
            remarks: 'Handles PR, RFQ, and PO',
            status: 'active'
        }),
        upsertOne(ProgressUpdate, { project: demoProjectName, updateDate: new Date('2026-05-07') }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            task: 'Prepare BOQ and BOM',
            updateDate: new Date('2026-05-07'),
            updatedBy: 'Design Engineer',
            progressPercentage: 100,
            currentStatus: 'Completed',
            workCompleted: 'BOM finalized and approved',
            pendingWork: 'Await procurement execution',
            issuesRisks: 'None',
            nextActionPlan: 'Raise PR and RFQ',
            attachments: '/uploads/demo-bom.pdf',
            remarks: 'Demo progress update'
        })
    ]);

    const stockOnHand = (item) => Number(item.currentStock ?? item.openingStock ?? 0);
    const procurementQty = (required, available) => Math.max(0, Number(required || 0) - Number(available || 0));

    const bomMaster = await upsertOne(BOMMaster, { bomNumber: 'BOM-001' }, {
        bomNumber: 'BOM-001',
        project: demoProjectName,
        costCenter: demoCostCenterCode,
        projectStage: 'Execution',
        drawingReference: 'DRW-CONV-001',
        revisionNumber: 'R1',
        bomTitle: 'Conveyor Electrical BOM',
        bomType: 'Electrical',
        preparedBy: 'Design Engineer',
        preparedDate: new Date('2026-05-03'),
        approvedBy: 'Project Manager',
        approvalDate: new Date('2026-05-04'),
        bomStatus: 'approved',
        remarks: 'Demo BOM for conveyor upgrade',
        attachments: '/uploads/conveyor-bom.pdf'
    });

    await Promise.all([
        upsertOne(BOMRevision, { bom: bomMaster.bomNumber, revisionNumber: 'R1' }, {
            bom: bomMaster.bomNumber,
            costCenter: demoCostCenterCode,
            revisionNumber: 'R1',
            revisionDate: new Date('2026-05-04'),
            revisionDescription: 'Initial released version',
            preparedBy: 'Design Engineer',
            approvedBy: 'Project Manager',
            revisionStatus: 'active',
            remarks: 'First revision for demo BOM'
        }),
        upsertOne(BOMRevision, { bom: bomMaster.bomNumber, revisionNumber: 'R2' }, {
            bom: bomMaster.bomNumber,
            costCenter: demoCostCenterCode,
            revisionNumber: 'R2',
            revisionDate: new Date('2026-05-08'),
            revisionDescription: 'Updated cable quantity after site review',
            preparedBy: 'Design Engineer',
            approvedBy: 'Project Manager',
            revisionStatus: 'active',
            remarks: 'Second revision for demo BOM'
        })
    ]);

    await Promise.all([
        upsertOne(BOMItem, { bom: bomMaster.bomNumber, item: motor.itemCode }, {
            bom: bomMaster.bomNumber,
            costCenter: demoCostCenterCode,
            item: motor.itemCode,
            itemCategory: motor.itemCategory,
            itemDescription: motor.itemName,
            unit: motor.unit,
            requiredQuantity: 2,
            availableStock: stockOnHand(motor),
            reservedQuantity: 1,
            shortageQuantity: procurementQty(2, stockOnHand(motor)),
            requiredProcurementQty: procurementQty(2, stockOnHand(motor)),
            supplier: demoSupplierCode,
            supplierPreferred: demoSupplierCode,
            leadTime: '2 Weeks',
            priority: 'high',
            remarks: 'Main drive motor',
            status: 'active'
        }),
        upsertOne(BOMItem, { bom: bomMaster.bomNumber, item: sensor.itemCode }, {
            bom: bomMaster.bomNumber,
            costCenter: demoCostCenterCode,
            item: sensor.itemCode,
            itemCategory: sensor.itemCategory,
            itemDescription: sensor.itemName,
            unit: sensor.unit,
            requiredQuantity: 6,
            availableStock: stockOnHand(sensor),
            reservedQuantity: 2,
            shortageQuantity: procurementQty(6, stockOnHand(sensor)),
            requiredProcurementQty: procurementQty(6, stockOnHand(sensor)),
            supplier: demoSupplierCode,
            supplierPreferred: demoSupplierCode,
            leadTime: '1 Week',
            priority: 'medium',
            remarks: 'Position sensor for belt control',
            status: 'active'
        }),
        upsertOne(BOMItem, { bom: bomMaster.bomNumber, item: cable.itemCode }, {
            bom: bomMaster.bomNumber,
            costCenter: demoCostCenterCode,
            item: cable.itemCode,
            itemCategory: cable.itemCategory,
            itemDescription: cable.itemName,
            unit: cable.unit,
            requiredQuantity: 250,
            availableStock: stockOnHand(cable),
            reservedQuantity: 50,
            shortageQuantity: procurementQty(250, stockOnHand(cable)),
            requiredProcurementQty: procurementQty(250, stockOnHand(cable)),
            supplier: demoSupplierCode,
            supplierPreferred: demoSupplierCode,
            leadTime: '3 Days',
            priority: 'medium',
            remarks: 'Control cabling',
            status: 'active'
        }),
        upsertOne(MaterialPlanning, { project: demoProjectName, bom: bomMaster.bomNumber }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            bom: bomMaster.bomNumber,
            planningDate: new Date('2026-05-05'),
            requiredDate: new Date('2026-05-18'),
            materialAvailabilityStatus: 'Partial',
            totalRequiredItems: 3,
            availableItems: 2,
            shortageItems: 1,
            reservedItems: 3,
            procurementRequired: true,
            planningStatus: 'pending',
            remarks: 'One item will need procurement'
        }),
        upsertOne(ShortageAnalysis, { project: demoProjectName, item: 'ITEM-0001' }, {
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            bom: bomMaster.bomNumber,
            item: 'ITEM-0001',
            requiredQuantity: 2,
            availableQuantity: 5,
            shortageQuantity: 0,
            suggestedSupplier: demoSupplierCode,
            expectedProcurementDate: new Date('2026-05-10'),
            priority: 'high',
            analysisStatus: 'completed',
            remarks: 'No shortage on demo BOM'
        }),
        upsertOne(MaterialReservation, { reservationNumber: 'RES-001' }, {
            reservationNumber: 'RES-001',
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            bom: bomMaster.bomNumber,
            task: 'Dispatch to Site',
            item: cable.itemCode,
            warehouse: demoWarehouseCode,
            requiredQuantity: 250,
            reservedQuantity: 250,
            reservationDate: new Date('2026-05-12'),
            requiredDate: new Date('2026-05-18'),
            reservedBy: 'Store Manager',
            reservationStatus: 'reserved',
            remarks: 'Cable reserved for site dispatch'
        })
    ]);

    const pr = await upsertOne(PurchaseRequest, { prNumber: 'PR-001' }, {
        prNumber: 'PR-001',
        requestDate: new Date('2026-05-05'),
        requestType: 'Material Request',
        project: demoProjectName,
        costCenter: demoCostCenterCode,
        bom: bomMaster.bomNumber,
        requestedBy: 'Procurement Lead',
        department: 'Procurement',
        requiredDate: new Date('2026-05-14'),
        priority: 'high',
        approvalStatus: 'approved',
        remarks: 'Raised based on BOM shortage planning',
        attachments: '/uploads/pr-001.pdf'
    });

    await Promise.all([
        upsertOne(PurchaseRequestItem, { purchaseRequest: pr.prNumber, item: motor.itemCode }, {
            purchaseRequest: pr.prNumber,
            costCenter: demoCostCenterCode,
            item: motor.itemCode,
            itemDescription: motor.itemName,
            unit: motor.unit,
            requestedQuantity: 2,
            approvedQuantity: 2,
            estimatedCost: 140000,
            supplier: demoSupplierCode,
            requiredDate: new Date('2026-05-14'),
            remarks: 'Approved for procurement',
            status: 'approved'
        }),
        upsertOne(PurchaseRequestItem, { purchaseRequest: pr.prNumber, item: sensor.itemCode }, {
            purchaseRequest: pr.prNumber,
            costCenter: demoCostCenterCode,
            item: sensor.itemCode,
            itemDescription: sensor.itemName,
            unit: sensor.unit,
            requestedQuantity: 6,
            approvedQuantity: 6,
            estimatedCost: 18000,
            supplier: demoSupplierCode,
            requiredDate: new Date('2026-05-14'),
            remarks: 'Approved for procurement',
            status: 'approved'
        }),
        upsertOne(RFQ, { rfqNumber: 'RFQ-001' }, {
            rfqNumber: 'RFQ-001',
            rfqDate: new Date('2026-05-06'),
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            purchaseRequest: pr.prNumber,
            supplier: demoSupplierCode,
            submissionDueDate: new Date('2026-05-08'),
            deliveryDate: new Date('2026-05-14'),
            rfqStatus: 'active',
            remarks: 'Demo RFQ for approved PR',
            attachments: '/uploads/rfq-001.pdf'
        }),
        upsertOne(SupplierQuotation, { quotationNumber: 'QUO-001' }, {
            quotationNumber: 'QUO-001',
            rfq: 'RFQ-001',
            supplier: demoSupplierCode,
            costCenter: demoCostCenterCode,
            quotationDate: new Date('2026-05-07'),
            validityDate: new Date('2026-05-21'),
            currency: 'INR',
            totalAmount: 158000,
            deliveryLeadTime: '7 Days',
            paymentTerms: '30 Days',
            quotationStatus: 'submitted',
            remarks: 'Best quote selected',
            attachments: '/uploads/quotation-001.pdf'
        }),
        upsertOne(PurchaseOrder, { poNumber: 'PO-001' }, {
            poNumber: 'PO-001',
            poDate: new Date('2026-05-08'),
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            supplier: demoSupplierCode,
            quotationReference: 'QUO-001',
            deliveryDate: new Date('2026-05-14'),
            currency: 'INR',
            paymentTerms: '30 Days',
            deliveryAddress: 'Chennai Plant - Stores',
            approvalStatus: 'approved',
            poStatus: 'active',
            remarks: 'Raised after PR approval',
            attachments: '/uploads/po-001.pdf'
        }),
        upsertOne(PurchaseOrderItem, { purchaseOrder: 'PO-001', item: motor.itemCode }, {
            purchaseOrder: 'PO-001',
            costCenter: demoCostCenterCode,
            item: motor.itemCode,
            itemDescription: motor.itemName,
            unit: motor.unit,
            orderedQuantity: 2,
            receivedQuantity: 0,
            pendingQuantity: 2,
            unitPrice: 70000,
            tax: 18,
            totalAmount: 165200,
            deliveryDate: new Date('2026-05-14'),
            remarks: 'Critical item',
            status: 'pending'
        }),
        upsertOne(PurchaseOrderItem, { purchaseOrder: 'PO-001', item: sensor.itemCode }, {
            purchaseOrder: 'PO-001',
            costCenter: demoCostCenterCode,
            item: sensor.itemCode,
            itemDescription: sensor.itemName,
            unit: sensor.unit,
            orderedQuantity: 6,
            receivedQuantity: 0,
            pendingQuantity: 6,
            unitPrice: 3000,
            tax: 18,
            totalAmount: 21240,
            deliveryDate: new Date('2026-05-14'),
            remarks: 'Sensor package',
            status: 'pending'
        })
    ]);

    const grn = await upsertOne(GRN, { grnNumber: 'GRN-001' }, {
        grnNumber: 'GRN-001',
        grnDate: new Date('2026-05-14'),
        purchaseOrder: 'PO-001',
        supplier: demoSupplierCode,
        costCenter: demoCostCenterCode,
        warehouse: demoWarehouseCode,
        receivedBy: 'Store Keeper',
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2026-05-14'),
        deliveryNoteNumber: 'DN-001',
        grnStatus: 'completed',
        remarks: 'Materials received',
        attachments: '/uploads/grn-001.pdf'
    });

    await Promise.all([
        upsertOne(GRNItem, { grn: grn.grnNumber, item: motor.itemCode }, {
            grn: grn.grnNumber,
            costCenter: demoCostCenterCode,
            item: motor.itemCode,
            itemDescription: motor.itemName,
            itemCategory: motor.itemCategory,
            orderedQuantity: 2,
            receivedQuantity: 2,
            acceptedQuantity: 2,
            rejectedQuantity: 0,
            unit: motor.unit,
            warehouseLocation: location.locationName,
            qcStatus: 'passed',
            remarks: 'Accepted',
            status: 'active'
        }),
        upsertOne(GRNItem, { grn: grn.grnNumber, item: sensor.itemCode }, {
            grn: grn.grnNumber,
            costCenter: demoCostCenterCode,
            item: sensor.itemCode,
            itemDescription: sensor.itemName,
            itemCategory: sensor.itemCategory,
            orderedQuantity: 6,
            receivedQuantity: 6,
            acceptedQuantity: 6,
            rejectedQuantity: 0,
            unit: sensor.unit,
            warehouseLocation: location.locationName,
            qcStatus: 'passed',
            remarks: 'Accepted',
            status: 'active'
        }),
        upsertOne(QualityCheck, { qcNumber: 'QC-001' }, {
            qcNumber: 'QC-001',
            grn: grn.grnNumber,
            item: motor.itemCode,
            costCenter: demoCostCenterCode,
            inspectionDate: new Date('2026-05-14'),
            inspectedBy: 'QC Inspector',
            inspectionResult: 'Passed',
            acceptedQuantity: 2,
            rejectedQuantity: 0,
            defectDetails: 'None',
            correctiveAction: 'None',
            qcStatus: 'completed',
            remarks: 'All good'
        }),
        upsertOne(StockUpdate, { transactionNumber: 'STKUPD-001' }, {
            transactionNumber: 'STKUPD-001',
            transactionDate: new Date('2026-05-14'),
            transactionType: 'GRN-IN',
            referenceNumber: grn.grnNumber,
            item: motor.itemCode,
            warehouse: demoWarehouseCode,
            costCenter: demoCostCenterCode,
            quantity: 2,
            unit: motor.unit,
            previousStock: 4,
            updatedStock: 6,
            updatedBy: 'Store Keeper',
            remarks: 'Stock updated after GRN',
            status: 'completed'
        })
    ]);

    await Promise.all([
        upsertOne(DispatchRequest, { dispatchRequestNumber: 'DRQ-001' }, {
            dispatchRequestNumber: 'DRQ-001',
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            task: 'Dispatch to Site',
            requestedBy: 'Site Engineer',
            requestDate: new Date('2026-05-18'),
            requiredDeliveryDate: new Date('2026-05-20'),
            deliveryLocation: 'Chennai Plant - Assembly Bay',
            priority: 'medium',
            dispatchStatus: 'approved',
            remarks: 'Requested after warehouse release'
        }),
        upsertOne(DispatchPlanning, { dispatchNumber: 'DSP-001' }, {
            dispatchNumber: 'DSP-001',
            dispatchDate: new Date('2026-05-18'),
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            dispatchRequest: 'DRQ-001',
            vehicle: 'TN-09-AB-1234',
            driver: 'Ramesh',
            warehouse: demoWarehouseCode,
            deliveryLocation: 'Site Gate 1',
            plannedDeliveryDate: new Date('2026-05-20'),
            dispatchStatus: 'active',
            remarks: 'Planned vehicle and route'
        }),
        upsertOne(DispatchItem, { dispatch: 'DSP-001', item: cable.itemCode }, {
            dispatch: 'DSP-001',
            reservationNumber: 'SRV-001',
            project: demoProjectName,
            warehouse: demoWarehouseCode,
            costCenter: demoCostCenterCode,
            item: cable.itemCode,
            itemDescription: cable.itemName,
            reservedQuantity: 250,
            dispatchQuantity: 250,
            deliveredQuantity: 0,
            unit: cable.unit,
            remarks: 'Cable bundle for site',
            status: 'active'
        }),
        upsertOne(DeliveryTracking, { trackingNumber: 'TRK-001' }, {
            trackingNumber: 'TRK-001',
            dispatch: 'DSP-001',
            costCenter: demoCostCenterCode,
            vehicle: 'TN-09-AB-1234',
            driver: 'Ramesh',
            dispatchDate: new Date('2026-05-18'),
            expectedDeliveryDate: new Date('2026-05-20'),
            actualDeliveryDate: null,
            currentLocation: 'Warehouse Exit',
            deliveryStatus: 'inTransit',
            remarks: 'Vehicle departed'
        }),
        upsertOne(DeliveryAcknowledgement, { acknowledgementNumber: 'ACK-001' }, {
            acknowledgementNumber: 'ACK-001',
            dispatch: 'DSP-001',
            project: demoProjectName,
            costCenter: demoCostCenterCode,
            receiverName: 'Site Supervisor',
            receivedDate: new Date('2026-05-20'),
            receivedQuantity: 250,
            deliveryCondition: 'Good',
            acknowledgementFile: '/uploads/ack-001.pdf',
            remarks: 'Received at site',
            status: 'completed'
        })
    ]);

    const workflow = await upsertOne(ApprovalWorkflow, { workflowName: 'PR Approval Flow' }, {
        workflowName: 'PR Approval Flow',
        moduleName: 'Procurement',
        department: 'Procurement',
        approvalType: 'Sequential',
        description: 'Demo approval workflow for purchase requests',
        workflowStatus: 'active'
    });

    await Promise.all([
        upsertOne(ApprovalLevel, { workflow: workflow.workflowName, levelNumber: 1 }, {
            workflow: workflow.workflowName,
            levelNumber: 1,
            approverRole: 'Procurement Manager',
            approverUser: 'Priya',
            approvalCondition: 'If amount <= 2,00,000',
            escalationDays: 1,
            remarks: 'Level 1 approval',
            status: 'active'
        }),
        upsertOne(ApprovalLevel, { workflow: workflow.workflowName, levelNumber: 2 }, {
            workflow: workflow.workflowName,
            levelNumber: 2,
            approverRole: 'Finance Head',
            approverUser: 'Karthik',
            approvalCondition: 'If amount > 2,00,000',
            escalationDays: 2,
            remarks: 'Level 2 approval',
            status: 'active'
        }),
        upsertOne(ApprovalTransaction, { transactionNumber: 'ATX-001' }, {
            transactionNumber: 'ATX-001',
            moduleName: 'Procurement',
            referenceNumber: pr.prNumber,
            workflow: workflow.workflowName,
            currentApprovalLevel: 2,
            requestedBy: 'Procurement Lead',
            requestedDate: new Date('2026-05-05'),
            approvedBy: 'Finance Head',
            approvalDate: new Date('2026-05-06'),
            approvalStatus: 'approved',
            comments: 'Approved for demo flow'
        })
    ]);

    const folder = await upsertOne(Folder, { folderName: 'Engineering Drawings', project: demoProjectName }, {
        folderName: 'Engineering Drawings',
        project: demoProjectName,
        parentFolder: null,
        description: 'SOLIDWORKS and PDF drawings'
    });

    const doc = await upsertOne(Doc, { documentNumber: 'DOC-001' }, {
        documentNumber: 'DOC-001',
        project: demoProjectName,
        folder: folder._id,
        documentName: 'Conveyor Assembly Drawing',
        documentType: 'solidworks',
        documentCategory: 'CAD/CAM',
        referenceModule: 'Project',
        referenceNumber: demoProjectCode,
        revisionNumber: 'R1',
        preparedBy: 'Design Engineer',
        approvedBy: 'Project Manager',
        uploadFile: '/uploads/conveyor-assembly.sldasm',
        documentStatus: 'active',
        remarks: 'Primary engineering model'
    });

    await Promise.all([
        upsertOne(DocVersion, { document: doc.documentNumber, versionNumber: 'V1' }, {
            document: doc.documentNumber,
            versionNumber: 'V1',
            revisionNumber: 'R1',
            versionDate: new Date('2026-05-03'),
            uploadedBy: 'Design Engineer',
            changeDescription: 'Initial release',
            approvalStatus: 'approved',
            remarks: 'First version',
            uploadFile: '/uploads/conveyor-assembly-v1.sldasm'
        }),
        upsertOne(DocAccessLog, { document: doc.documentNumber, accessedBy: 'Project Manager' }, {
            document: doc.documentNumber,
            accessedBy: 'Project Manager',
            accessDate: new Date('2026-05-07'),
            accessType: 'View',
            ipAddress: '192.168.1.10',
            deviceInformation: 'Laptop',
            remarks: 'Reviewed before approval'
        }),
        upsertOne(ProjectDocument, { project: demoProjectName, documentName: 'Conveyor BOM PDF' }, {
            project: demoProjectName,
            documentName: 'Conveyor BOM PDF',
            documentType: 'pdf',
            documentCategory: 'BOM',
            revisionNumber: 'R1',
            uploadedBy: 'Design Engineer',
            uploadFile: '/uploads/conveyor-bom.pdf',
            approvalRequired: true,
            documentStatus: 'approved',
            remarks: 'Project document for BOM'
        })
    ]);

    const report = {
        project: demoProjectName,
        projectId: project._id,
        projectCode: demoProjectCode,
        bomNumber: bomMaster.bomNumber,
        prNumber: pr.prNumber,
        poNumber: 'PO-001',
        grnNumber: grn.grnNumber,
        dispatchNumber: 'DSP-001'
    };

    console.log('Demo data seeded successfully.');
    console.log('Flow you can show:');
    console.log(`1. Project: ${report.project} (${report.projectCode})`);
    console.log(`2. BOM: ${report.bomNumber}`);
    console.log(`3. PR -> PO: ${report.prNumber} -> ${report.poNumber}`);
    console.log(`4. GRN: ${report.grnNumber}`);
    console.log(`5. Dispatch: ${report.dispatchNumber}`);
    console.log(`6. Overview API: GET /api/project/${report.projectId}/overview`);
    process.exit(0);
}

seedDemoData().catch((error) => {
    console.error('Demo seed failed:', error);
    process.exit(1);
});
