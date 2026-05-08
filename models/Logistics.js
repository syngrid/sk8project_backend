const mongoose = require('mongoose');

// Logistics Models
const dispatchRequestSchema = new mongoose.Schema({
    dispatchRequestNumber: { type: String, unique: true, required: true },
    project: { type: String, required: true },
    costCenter: { type: String },
    task: { type: String },
    item: { type: String },
    itemDescription: { type: String },
    quantity: { type: Number, default: 0 },
    unit: { type: String },
    requestedBy: { type: String },
    requestDate: { type: Date, default: Date.now },
    requiredDeliveryDate: { type: Date },
    deliveryLocation: { type: String },
    priority: { type: String },
    dispatchStatus: { type: String, default: 'pending' },
    remarks: { type: String }
}, { timestamps: true });

const dispatchPlanningSchema = new mongoose.Schema({
    dispatchNumber: { type: String, unique: true, required: true },
    dispatchDate: { type: Date, default: Date.now },
    project: { type: String, required: true },
    costCenter: { type: String },
    dispatchRequest: { type: String },
    vehicle: { type: String },
    driver: { type: String },
    warehouse: { type: String },
    deliveryLocation: { type: String },
    plannedDeliveryDate: { type: Date },
    dispatchStatus: { type: String, default: 'active' },
    remarks: { type: String }
}, { timestamps: true });

const dispatchItemSchema = new mongoose.Schema({
    dispatch: { type: String, required: true },
    reservationNumber: { type: String },
    project: { type: String },
    item: { type: String, required: true },
    itemDescription: { type: String },
    reservedQuantity: { type: Number, default: 0 },
    dispatchQuantity: { type: Number, required: true },
    deliveredQuantity: { type: Number, default: 0 },
    unit: { type: String },
    costCenter: { type: String },
    warehouse: { type: String },
    remarks: { type: String },
    status: { type: String, default: 'active' }
}, { timestamps: true });

const deliveryTrackingSchema = new mongoose.Schema({
    trackingNumber: { type: String, unique: true, required: true },
    dispatch: { type: String, required: true },
    costCenter: { type: String },
    vehicle: { type: String },
    driver: { type: String },
    dispatchDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    currentLocation: { type: String },
    deliveryStatus: { type: String, default: 'inTransit' },
    remarks: { type: String }
}, { timestamps: true });

const deliveryAcknowledgementSchema = new mongoose.Schema({
    acknowledgementNumber: { type: String, unique: true, required: true },
    dispatch: { type: String, required: true },
    project: { type: String },
    costCenter: { type: String },
    receiverName: { type: String },
    receivedDate: { type: Date, default: Date.now },
    receivedQuantity: { type: Number },
    deliveryCondition: { type: String },
    acknowledgementFile: { type: String },
    remarks: { type: String },
    status: { type: String, default: 'completed' }
}, { timestamps: true });

module.exports = {
    DispatchRequest: mongoose.model('DispatchRequest', dispatchRequestSchema),
    DispatchPlanning: mongoose.model('DispatchPlanning', dispatchPlanningSchema),
    DispatchItem: mongoose.model('DispatchItem', dispatchItemSchema),
    DeliveryTracking: mongoose.model('DeliveryTracking', deliveryTrackingSchema),
    DeliveryAcknowledgement: mongoose.model('DeliveryAcknowledgement', deliveryAcknowledgementSchema)
};
