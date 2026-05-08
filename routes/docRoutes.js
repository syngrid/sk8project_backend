const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/DocManagement');

const upload = require('../utils/upload');

const validateDocPayload = (req, res, next) => {
    const documentType = String(req.body.documentType || '').toLowerCase();
    const filename = String(req.file?.originalname || req.body.documentName || '').toLowerCase();
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const allowedTypes = ['pdf', 'cad', 'cam', 'solidworks', 'sldprt', 'sldasm', 'slddrw'];

    if (documentType && !allowedTypes.includes(documentType)) {
        return res.status(400).json({ message: 'Document type must be PDF or CAD/CAM/SOLIDWORKS related' });
    }

    if (ext && !['.pdf', '.sldprt', '.sldasm', '.slddrw', '.dwg', '.dxf'].includes(ext)) {
        return res.status(400).json({ message: 'Only PDF and CAD files are allowed' });
    }

    next();
};

// Custom route for Document Creation with File Upload
router.use('/folders', createCrudRoutes(models.Folder));

// Custom route for Multiple Document Uploads
router.post('/multi-upload', upload.array('files', 10), validateDocPayload, async (req, res) => {
    try {
        const { project, folder, documentType } = req.body;
        const docs = [];
        for (const file of req.files) {
            const doc = new models.Doc({
                documentNumber: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                project,
                folder,
                documentName: file.originalname,
                documentType,
                uploadFile: `/uploads/${file.filename}`
            });
            await doc.save();
            docs.push(doc);
        }
        res.status(201).json(docs);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/docs', upload.single('uploadFile'), validateDocPayload, async (req, res) => {
    console.log('POST /docs hit');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    try {
        const docData = req.body;
        if (req.file) {
            docData.uploadFile = `/uploads/${req.file.filename}`;
            console.log('File saved to:', docData.uploadFile);
        }
        const doc = new models.Doc(docData);
        await doc.save();
        res.status(201).json(doc);
    } catch (err) {
        console.error('Error in POST /docs:', err);
        res.status(400).json({ message: err.message });
    }
});

router.put('/docs/:id', upload.single('uploadFile'), validateDocPayload, async (req, res) => {
    try {
        const docData = req.body;
        if (req.file) {
            docData.uploadFile = `/uploads/${req.file.filename}`;
        }
        const doc = await models.Doc.findByIdAndUpdate(req.params.id, docData, { new: true });
        res.json(doc);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.use('/docs', createCrudRoutes(models.Doc));
router.use('/versions', createCrudRoutes(models.DocVersion));
router.use('/logs', createCrudRoutes(models.DocAccessLog));

module.exports = router;
