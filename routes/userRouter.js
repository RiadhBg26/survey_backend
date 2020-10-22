const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const User = require('../models/userModel');
const Subject = require('../models/subjectModel');
const passport = require('../controllers/passport');
const jwt = require('jsonwebtoken');

//____________________________Get all Experts __________________________
router.get('/', function (req, res) {
  // console.log('GET request');
  User.find({})
    .select(' -__v ')
    // .populate('specialty', {'_id ': 0})
    .populate({ path: 'subjects', populate: { path: ' userId' }, model: 'subject', select: '-__v' })
    .exec(function (err, users) {
      if (users.length > 0) {
        res.status(200).json({
          count: users.length,
          users: users,
        });
        // console.log(user[1]);
      } else {
        res.json({ message: 'No users found' })
        // console.log('bad');

      };
    });

});

//____________________________Get single Expert __________________________

router.get('/:id', function (req, res) {
  // console.log('GET request');
  id = req.params.id;
  User.findOne({ _id: id })
    .select(' -__v')
    // .populate('specialty', {'_id ': 0})
    .populate({ path: 'subjects', model: 'subject', select: '-__v' })
    .exec(function (err, user) {
      if (user) {
        res.status(200).send({
          id: user._id,
          email: user.email,
          password: user.password,
          subjects: user.subjects,
          votes: user.votes
          // user: user.role
        });
      } else {
        res.json({ message: `No user found with id : ${id}` })
        // console.log('bad');
      }
    });
});


//____________________________Register User __________________________

//When the user sends a post request to this route, passport authenticates the user based on the
//middleware created previously

router.post('/signup', passport.authenticate('signup', { session: false }), async (req, res, next) => {

  res.json({
    message: 'Signup successful',
    user: req.user
  });

  try {
    const savedUser = await req.user.save();
    res.send(savedUser)
    console.log(savedUser);
  } catch (err) {
    res.status(400)
  }
});

//____________________________Login User __________________________
router.post('/login', async (req, res, next) => {
  passport.authenticate('local', async (err, user) => {
    try {
      // console.log(req.body, user, err);
      if (err || !user) {
        const error = new Error('An Error occurred')
        console.log(error);
        return next(err);
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return next(error)
        console.log('this', user);

        //We don't want to store the sensitive information such as the
        //user password in the token so we pick only the email and id
        const body = { _id: user._id, email: user.email };
        //Sign the JWT token and populate the payload with the user email and id
        const token = jwt.sign({ user: body }, 'top_secret');
        //Send back the token to the user
        userId = user._id
        // console.log('id:: ',(userId))
        return res.json({ token, user, userId });

      });
    } catch (error) {
      // console.log('this error', error);
      return next(error);
    };
  })(req, res, next);
});

//____________________________Securing Routes__________________________
//Let's say the route below is very sensitive and we want only authorized users to have access

// Displays information tailored according to the logged in user
router.get('/profile', (req, res, next) => {
  //We'll just send back the user details and the token
  res.json({
    message: 'You made it to the secure route',
    user: req.user,
    token: req.query.secret_token
  })
  console.log(req.user);
});


const limiter = rateLimit({
  windowMs: 1000 * 60 * 60 * 24,  // 24 hours,
  max: 5, // number of requests 
  message: {
    status: 429,
    error: 'You are doing that too much. Please try again in 10 minutes.'
  }
})

// router.put('/:id', limiter, function (req, res) {

//   let id;
//   User.findByIdAndUpdate({ _id: req.params.id }, req.body.choice).then(async function (user) {
//     for (let i = 0; i < user.subjects.length; i++) {
//       id = user.subjects[i];
//     }
//     let subject = await Subject.findById(id)
//     console.log('=> ', id);
//     subject.choice.push(req.body.choice)
//     subject.save();
//     res.send({
//       message: 'survey updated',
//       user: user
//     })
    
//   });
// });
module.exports = router