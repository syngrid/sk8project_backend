const mongoose = require('mongoose');
const { PurchaseRequest, PurchaseOrder, PurchaseApproval, PurchaseRequestItem } = require('../models/Procurement');
const Project = require('../models/Project');
const Supplier = require('../models/Supplier');
const InventoryItem = require('../models/InventoryItem');
const { BOMMaster } = require('../models/BOMManagement');

const seedData = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/sk8_engineering_erp');
        console.log('Connected to DB...');

        // 1. Dummy Projects
        const projects = [
            { projectCode: 'PRJ-001', projectName: 'Conveyor Line Setup', projectStatus: 'ongoing' },
            { projectCode: 'PRJ-002', projectName: 'Warehouse Automation', projectStatus: 'ongoing' },
            { projectCode: 'PRJ-003', projectName: 'Robotic Arm Installation', projectStatus: 'ongoing' }
        ];
        for (const p of projects) {
            await Project.findOneAndUpdate({ projectCode: p.projectCode }, p, { upsert: true });
        }

        // 2. Dummy Suppliers
        const suppliers = [
            { supplierCode: 'SUP-001', supplierName: 'Industrial Steels Ltd', email: 'sales@indsteel.com' },
            { supplierCode: 'SUP-002', supplierName: 'Precision Motors', email: 'contact@precmotors.com' },
            { supplierCode: 'SUP-003', supplierName: 'Global Electronics', email: 'info@globalelec.com' }
        ];
        for (const s of suppliers) {
            await Supplier.findOneAndUpdate({ supplierCode: s.supplierCode }, s, { upsert: true });
        }

        // 3. Dummy Inventory Items
        const items = [
            { itemCode: 'STL-001', itemName: 'Steel Plate 10mm', itemCategory: 'Raw Material', unit: 'Sheets' },
            { itemCode: 'MTR-050', itemName: 'Servo Motor 50W', itemCategory: 'Electrical', unit: 'Nos' },
            { itemCode: 'BLT-200', itemName: 'Rubber Belt 2m', itemCategory: 'Mechanical', unit: 'Meters' }
        ];
        for (const i of items) {
            await InventoryItem.findOneAndUpdate({ itemCode: i.itemCode }, i, { upsert: true });
        }

        // 4. Dummy BOM Masters
        const boms = [
            { bomNumber: 'BOM-2024-001', bomTitle: 'Main Conveyor BOM', project: 'Conveyor Line Setup', bomStatus: 'approved' },
            { bomNumber: 'BOM-2024-002', bomTitle: 'Motor Assembly', project: 'Warehouse Automation', bomStatus: 'approved' }
        ];
        for (const b of boms) {
            await BOMMaster.findOneAndUpdate({ bomNumber: b.bomNumber }, b, { upsert: true });
        }

        // 5. Dummy Purchase Requests
        const prs = [
            {
                prNumber: 'PR-2024-101',
                project: 'Conveyor Line Setup',
                bom: 'BOM-2024-001',
                requestType: 'BOM',
                approvalStatus: 'Pending Approval',
                priority: 'High',
                requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                remarks: 'Urgent requirement for production line'
            },
            {
                prNumber: 'PR-2024-102',
                project: 'Warehouse Automation',
                requestType: 'Manual',
                approvalStatus: 'Approved',
                priority: 'Medium',
                requiredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                remarks: 'Spare parts for maintenance'
            }
        ];

        for (const pr of prs) {
            await PurchaseRequest.findOneAndUpdate({ prNumber: pr.prNumber }, pr, { upsert: true });
            await PurchaseRequestItem.findOneAndUpdate(
                { purchaseRequest: pr.prNumber },
                {
                    item: 'MTR-050',
                    itemDescription: 'Servo Motor 50W',
                    unit: 'Nos',
                    requestedQuantity: 5,
                    shortageQuantity: 5,
                    status: 'pending'
                },
                { upsert: true }
            );
        }

        console.log('Comprehensive dummy data seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedData();
