//app config
const express = require('express');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session')
const cors = require('cors');
const rateLimit = require("express-rate-limit");

const passport = require('./controllers/passport')
const app = express();
var path = require('path');



//routes
const userRouter = require('./routes/userRouter');
const subjectRouter = require('./routes/subjectRouter');

app.use(cors({
    origin:'*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: 'Content-Type, Authorization, Origin, X-Requested-With, Accept, jwt'
}));

mongoose.connect('mongodb://localhost/survey', { 
    useUnifiedTopology: true,  
    useNewUrlParser: true, 
    useCreateIndex: true,
    useFindAndModify: false
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser());
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/user',  userRouter);
app.use('/api/survey',  subjectRouter);

app.listen(process.env.port || 3000, function() {
    console.log('listening to port 3000 ...');
})

// "C:\Program Files\MongoDB\Server\4.2\bin\mongod.exe" --dbpath="c:\data\db"

