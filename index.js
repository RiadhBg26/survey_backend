const express = require('express')
const mongoose = require('mongoose')
const morgan = require ('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const passport = require('passport')
const app = express()


//routes
const userRoutes = require('./routes/userRouter')
const surveyRoutes = require('./routes/surveyRouter')
//connect to mongoDB
mongoose.connect('mongodb://localhost:/tests', {
    useCreateIndex: true, 
    useFindAndModify: true, 
    useUnifiedTopology: true,
    useNewUrlParser: true
})

app.use(cors({
    origin:'*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: 'Content-Type, Authorization, Origin, X-Requested-With, Accept, jwt'
}));

// app.use(morgan('dev'))
app.use(bodyParser.json(), bodyParser.urlencoded({extended: false}))
passport.initialize(),
passport.session()

app.use('/api/users', userRoutes)
app.use('/api/surveys', surveyRoutes)

app.listen(process.env.port || 3000, function() {
    console.log('listening to port 3000...');
})

//   "C:\Program Files\MongoDB\Server\4.2\bin\mongod.exe" --dbpath="c:\data\db"
