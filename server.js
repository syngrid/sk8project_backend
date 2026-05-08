
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const Admin = require('./models/Admin');
const { connectDatabase } = require('./utils/db');

const path = require('path');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/health', (req, res) => {
    res.send('API is running');
});

// Middleware
app.use(morgan('dev'));
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Seeding Admin
const seedAdmin = async () => {
    try {
        const adminExists = await Admin.findOne({ email: 'contact@gmail.com' });
        if (!adminExists) {
            const admin = new Admin({ email: 'contact@gmail.com', password: 'Test@123' });
            await admin.save();
            console.log('Admin account seeded successfully');
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
};

// Token Helpers
const generateAccessToken = (admin) => {
    return jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (admin) => {
    return jwt.sign({ id: admin._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

// Auth Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(admin);
        const refreshToken = generateRefreshToken(admin);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ accessToken, admin: { id: admin._id, email: admin.email, role: admin.role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/admin/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) return res.status(401).json({ message: 'User not found' });

        const accessToken = generateAccessToken(admin);
        res.json({ accessToken });
    } catch (err) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
});

const masterRoutes = require('./routes/masterRoutes');
const projectRoutes = require('./routes/projectRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const bomRoutes = require('./routes/bomRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const warehouseOpsRoutes = require('./routes/warehouseOpsRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const docRoutes = require('./routes/docRoutes');
const approvalRoutes = require('./routes/approvalRoutes');

app.use('/api/master', masterRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/warehouse-ops', warehouseOpsRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/approvals', approvalRoutes);

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
});

const startServer = async () => {
    try {
        await connectDatabase();
        await seedAdmin();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

startServer();
