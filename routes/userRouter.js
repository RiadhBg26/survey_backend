const express = require('express')
const router = express.Router()
const User = require('../models/userModel')
const Jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../controllers/passport')

signToken = (user) => {
    return Jwt.sign({
        iss: user,
        sub: user._id, //what to assign the token to(should be something constant and id is the ideal subject)
        iat: new Date().getTime(), //when the token was signed(optional)
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        // exp: new Date().setDate(new Date().getDate() + 1) //expirs one day later(current time + 1 day ahead)
    }, 'secret_key' )
}

router.post('/signup', async function (req, res, next) {
  const { email, password } = req.body
  if (!email) {
    return res.status(400).json({
      error: 'email is required'
    });
  }
  if (!password) {
    return res.status(400).json({
      error: 'password is required'
    });
  }
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return res.status(403).json({
      error: 'email already exists in database'
    });
  }
  const newUser = new User({
    email: email,
    password: password,
  })

  //generate a token
  // const token = signToken(newUser)

  //save user in db
  await newUser.save().then(function (user) {
    res.json({
      message: 'user created successfully!',
      user: newUser,
      // token: token
    });
  });
});

router.post('/login', passport.authenticate('local', { session: false }), async function (req, res, next) {
  //generate a token on login
  const token = signToken(req.user)
  console.log(token);
  res.json({
    message: 'logged in',
    userId: req.user.id,
    token: token,
  })
  console.log('logged in');
});

// access to secured route with token
router.get('/securedpage', verifyToken, function (req, res, next) {
  return res.status(200).json(decodedToken.iss);
})

var decodedToken = '';
async function verifyToken(req, res, next) {
  let token = await req.query.token;
  Jwt.verify(token, 'secret_key', function (err, tokendata) {
    if (err) {
      console.log(err);
      return res.status(400).json({ message: ' Unauthorized request', error: err });
    }
    if (tokendata) {
      decodedToken = tokendata;
      next();
    }
  })
}

//redirect to profile
router.get('/secret', passport.authenticate('jwt', { session: false }), async function (req, res, next) {
  console.log(`welcome to secret page *${req.user.email}*`);
  res.json({
    message: `welcome to secret page *${req.user.email}*`
  })
})

//____________________________Get all users __________________________
router.get('/', function (req, res) {
  // console.log('GET request');
  User.find({})
    .select(' -__v ')
    // .populate('specialty', {'_id ': 0})
    .populate({ path: 'surveys', populate: { path: 'userId' }, model: 'survey', select: '-__v' })
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

//____________________________Get single user __________________________

router.get('/:id', function (req, res) {
  // console.log('GET request');
  id = req.params.id;
  User.findOne({ _id: id })
    .select(' -__v')
    // .populate('specialty', {'_id ': 0})
    .populate({ path: 'surveys', model: 'survey', select: '-__v' })
    .exec(function (err, user) {
      if (user) {
        res.status(200).send({
          id: user._id,
          email: user.email,
          password: user.password,
          surveys: user.surveys,
          answeredSurveys: user.answeredSurveys,
          // token: user.token
          // role: user.role
        });
      } else {
        res.json({ message: `No user found with id : ${id}` })
        // console.log('bad');
      }
    });
});

//___________

module.exports = router