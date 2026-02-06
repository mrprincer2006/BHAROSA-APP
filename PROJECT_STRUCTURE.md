# BHAROSA E-Commerce Platform - Project Structure

## 📁 Directory Structure

```
bharosa-ecommerce/
├── 📄 .env                    # Environment variables (local)
├── 📄 .env.example            # Environment variables template
├── 📄 .gitignore              # Git ignore file
├── 📄 package.json            # Node.js dependencies
├── 📄 package-lock.json       # Locked dependencies
├── 📄 README.md               # Project documentation
├── 📄 PROJECT_STRUCTURE.md    # This file
│
├── 📁 src/                    # Backend source code
│   ├── 📄 app.js              # Main Express application
│   ├── 📁 config/            # Configuration files
│   │   └── 📄 database.js     # Database configuration
│   ├── 📁 controllers/       # Route controllers
│   │   ├── 📄 auth.js        # Authentication controller
│   │   ├── 📄 orders.js      # Orders controller
│   │   ├── 📄 products.js     # Products controller
│   │   └── 📄 analytics.js    # Analytics controller
│   ├── 📁 middleware/        # Express middleware
│   │   ├── 📄 auth.js        # Authentication middleware
│   │   ├── 📄 cors.js        # CORS middleware
│   │   └── 📄 validation.js  # Input validation
│   ├── 📁 models/             # Data models
│   │   ├── 📄 database.js     # Database connection & schema
│   │   ├── 📄 Order.js       # Order model
│   │   ├── 📄 Product.js      # Product model
│   │   └── 📄 User.js         # User model
│   ├── 📁 routes/             # API routes
│   │   ├── 📄 index.js        # Routes index
│   │   ├── 📄 auth.js         # Auth routes
│   │   ├── 📄 orders.js       # Order routes
│   │   ├── 📄 products.js     # Product routes
│   │   └── 📄 analytics.js    # Analytics routes
│   └── 📁 utils/              # Utility functions
│       ├── 📄 email.js        # Email utilities
│       ├── 📄 sms.js          # SMS utilities
│       ├── 📄 payment.js      # Payment utilities
│       └── 📄 validators.js   # Input validators
│
├── 📁 public/                 # Frontend static files
│   ├── 📄 index.html          # Homepage
│   ├── 📄 shop.html           # Product listing page
│   ├── 📄 product.html        # Product detail page
│   ├── 📄 checkout.html       # Checkout page
│   ├── 📄 order.html          # Order confirmation page
│   ├── 📄 orders.html         # Orders list page
│   ├── 📄 admin-orders.html   # Admin orders management
│   ├── 📄 analytics.html      # Analytics dashboard
│   ├── 📄 analytics-export.html # Export/Import page
│   ├── 📄 join.html           # User registration/login
│   ├── 📄 payment.html       # Payment processing
│   ├── 📁 css/                # Stylesheets
│   │   └── 📄 styles.css      # Main stylesheet
│   ├── 📁 js/                 # JavaScript files
│   │   ├── 📄 main.js         # Main JavaScript
│   │   ├── 📄 shop.js         # Shop functionality
│   │   ├── 📄 checkout.js     # Checkout functionality
│   │   └── 📄 analytics.js    # Analytics functionality
│   └── 📁 images/             # Static images
│       └── 📄 bharosa.png     # Logo
│
├── 📁 docs/                   # Documentation
│   ├── 📄 API.md              # API documentation
│   ├── 📄 DEPLOYMENT.md       # Deployment guide
│   └── 📄 CONTRIBUTING.md     # Contributing guidelines
│
└── 📁 node_modules/           # Node.js dependencies
```

## 🏗️ Architecture Overview

### Backend (Node.js + Express)
- **MVC Pattern**: Models, Views (API), Controllers
- **RESTful API**: Clean, predictable endpoints
- **Middleware Stack**: Authentication, validation, CORS, security
- **Database**: SQLite with prepared statements
- **Services**: Email, SMS, Payment processing

### Frontend (Vanilla JavaScript)
- **SPA-like Navigation**: Multi-page app with shared components
- **Component-based**: Reusable UI components
- **Local Storage**: Cart and user session management
- **Responsive Design**: Mobile-first approach

### Key Features
- ✅ **Product Management**: Browse, search, filter products
- ✅ **Shopping Cart**: Add/remove items, quantity management
- ✅ **Checkout Process**: Address, payment, order confirmation
- ✅ **Order Management**: View orders, status tracking
- ✅ **Admin Panel**: Order management, analytics
- ✅ **Analytics Dashboard**: Sales reports, customer insights
- ✅ **Export/Import**: Data export in multiple formats
- ✅ **Email Notifications**: Order receipts, status updates
- ✅ **SMS OTP**: Phone verification via Twilio/Fast2SMS
- ✅ **Payment Integration**: Razorpay payment gateway

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   - Frontend: http://localhost:3000
   - API Base: http://localhost:3000/api

## 📊 Database Schema

### Tables
- **users**: User accounts and profiles
- **orders**: Order information and status
- **products**: Product catalog
- **otps**: One-time passwords for verification
- **analytics**: Analytics data and metrics

## 🔐 Security Features

- **Input Validation**: All inputs sanitized
- **SQL Injection Prevention**: Prepared statements
- **XSS Protection**: Content sanitization
- **CSRF Protection**: Token-based validation
- **Rate Limiting**: API endpoint protection
- **Secure Headers**: HSTS, CSP, X-Frame-Options

## 📧 External Integrations

- **Email**: Nodemailer with SMTP
- **SMS**: Twilio and Fast2SMS
- **Payments**: Razorpay
- **Analytics**: Chart.js for visualizations

## 🔄 Development Workflow

1. **Feature Development**: Create feature branches
2. **Testing**: Manual testing with console logs
3. **Code Review**: Peer review process
4. **Deployment**: Production deployment checklist

## 📝 Coding Standards

- **JavaScript**: ES6+ modules, async/await
- **HTML**: Semantic HTML5, accessibility
- **CSS**: BEM methodology, CSS variables
- **File Naming**: kebab-case for files, PascalCase for classes
- **Comments**: JSDoc for functions, inline for complex logic

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

## 📈 Performance Optimization

- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: WebP format, lazy loading
- **Code Splitting**: Separate bundles for features
- **Caching**: Browser and server-side caching
- **Minification**: CSS/JS minification in production

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection**: Check SQLite file permissions
2. **Email Sending**: Verify SMTP credentials
3. **Payment Gateway**: Check Razorpay keys
4. **CORS Issues**: Verify allowed origins
5. **Port Conflicts**: Change PORT in .env

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📞 Support

For issues and questions:
1. Check documentation in `/docs`
2. Review console logs
3. Check environment variables
4. Verify database schema

---

*Last Updated: February 2026*
