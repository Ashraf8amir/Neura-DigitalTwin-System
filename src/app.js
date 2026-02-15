const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const config = require('./config/config.js');
const AppError = require('./core/appError.js');
const globalErrorHandler = require('./shared/middlewares/globalErrorHandler.middleware.js');
const { HTTP_STATUS_TEXT } = require('./shared/constants/enums.js');
const routes = require('./routes/index.js');
const passport = require('./config/passport.js');
const logger = require('./core/logger.js');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use((config.nodeEnv === 'development') ? morgan('dev') : morgan('combined'));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {res.status(200).json({ status: HTTP_STATUS_TEXT.OK, message: 'Hello Render!' })});
app.get('/keep-alive', (req, res) => {
    logger.info('I just got poked to stay awake!');
    res.status(200).send('I am alive');
});
app.use('/api/v1', routes);
app.all('/{*splat}', (req, res, next) => {
    next(new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, `Can't find ${req.originalUrl} on this server!`));
});

app.use(globalErrorHandler);


module.exports = app;