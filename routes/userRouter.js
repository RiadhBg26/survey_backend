const express = require('express')
const router = express.Router()
const User = require('../models/userModel')
const Jwt = require('jsonwebtoken')
const randtoken = require('rand-token');
const passport = require('passport')
const passportConfig = require('../controllers/passport')

const SECRET = 'secret_key'
const refreshTokens = {};

//signup user
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
    console.log('user exists');
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
      user: user,
      // token: token
    });
  });
});

//login user
router.post('/login', passport.authenticate('local', { session: false }), async function (req, res, next) {
  console.log('logged in');
  const user = {user: req.user}
  //generate token
  const token = Jwt.sign(user, SECRET, { expiresIn: 600 })
  const refreshToken = randtoken.uid(256);
  refreshTokens[refreshToken] = user;
  res.json({
    message: 'logged in',
    userId: req.user._id,
    token: token,
    refreshToken: refreshToken
  });
});

// refresh token
router.post('/refresh', async function (req, res, next) {
  try {    
    const refreshToken = req.body.refreshToken;
    const foundUser = await User.findById({_id: req.body.id});
    if (!foundUser) {
      console.log('user not found');
      delete refreshTokens[refreshToken];
      return res.json({error:'0'})
      
    } else if(refreshToken in refreshTokens) {
      const user = { user: refreshTokens[refreshToken] }
      const token = Jwt.sign(user, SECRET, { expiresIn: 600  });
      console.log('token refreshed');
      return res.json({ token: token})
      
    } 
    else {
      console.log('status 401');
      
      return res.sendStatus(401);
    }
  } catch (error) {
    // console.log(error);
    next(error)
  }
});
// access to secured route with token
router.get('/securedpage', verifyToken, function (req, res, next) {
  console.log('secured route');
  console.log('new token expires in : ', new Date(decodedToken.exp * 1000));
  return res.status(200).json({
    user: decodedToken.user,
    message: 'welcome to secured app'
  });
})

//verify token
var decodedToken = '';
async function verifyToken(req, res, next) {
  let token = await req.query.token;
  Jwt.verify(token, 'secret_key', function (err, tokendata) {
    if (err && token) {
      return res.status(401).json({ message: ' Unauthorized request', error: err });
    }
    if (tokendata) {
      decodedToken = tokendata;
      // console.log('decoded token => ', decodedToken);
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


router.post('/logout', function (req, res) { 
  console.log('logout route');
  const refreshToken = req.body.refreshToken;
  if (refreshToken in refreshTokens) { 
    delete refreshTokens[refreshToken];
    console.log('loggoed out');
    delete req.user
  } 
  res.sendStatus(204); 
});
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




