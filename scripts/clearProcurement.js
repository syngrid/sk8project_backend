const mongoose = require('mongoose');
const { PurchaseRequest, PurchaseRequestItem, PurchaseApproval, ApprovalHistory, PurchaseOrder, PurchaseOrderItem } = require('../models/Procurement');

const clearData = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/sk8_engineering_erp');
        console.log('Connected to DB...');

        await PurchaseRequest.deleteMany({});
        await PurchaseRequestItem.deleteMany({});
        await PurchaseApproval.deleteMany({});
        await ApprovalHistory.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await PurchaseOrderItem.deleteMany({});

        console.log('Procurement dummy data cleared successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Clear failed:', err);
        process.exit(1);
    }
};

clearData();
