const express = require('express')
const router = express.Router()
const User = require('../models/userModel')
const Jwt = require('jsonwebtoken')
const randtoken = require('rand-token');
const passport = require('passport')
const passportConfig = require('../controllers/passport')
const redis = require('../controllers/redis');
const client = require('../controllers/redis');
const createHttpError = require('http-errors');

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
  const existingLocalUser = await User.findOne({ "local.email": email })
  if (existingLocalUser) {
    // console.log('local user exists');
    return res.status(403).json({
      error: 'email already exists in database'
    });
  }
  const foundUser = await User.findOne({
    $or: [
      { "google.email": email },
      { "facebook.email": email },
    ]
  });

  if (foundUser) {
    // Let's merge them?
    foundUser.methods.push('local')
    foundUser.local = {
      email: email,
      password: password,
      surveys: foundUser.local.surveys,
      answeredSurveys: foundUser.local.answeredSurveys
    }
    
    await foundUser.save()
    return res.status(200).json({ 
      success: 'Local user merged with google/facebook user' ,
      user: foundUser
    });
  }
  
  //if not merged create new user
  const newUser = new User({ 
    methods: ['local'],
    local: {
      email: email, 
      password: password
    }
  });

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
  const user = { user: req.user }
  //generate token
  const token = Jwt.sign(user, SECRET, { expiresIn: 60 })
  const refreshToken = randtoken.uid(256);
  const userRefreshToken = refreshTokens[refreshToken] = user;
  return res.json({
    message: 'logged in',
    userId: req.user._id,
    token: token,
    refreshToken: refreshToken
  });
});

// refresh token
router.post('/refresh', async function (req, res, next) {
  try {
    const token = req.query.token;
    const refreshToken = req.body.refreshToken;
    const id = req.body.id
    if (id !== null) {
      const foundUser = await User.findById({ _id: id });
      if (!foundUser) {
        delete refreshTokens[refreshToken];
        delete token
        return res.json({ error: '404', })
      } else if (refreshToken in refreshTokens) {
        const user = { user: refreshTokens[refreshToken] }
        const token = Jwt.sign(user, SECRET, { expiresIn: 60 });
        console.log('token refreshed');
        return res.json({ token: token })

      }
      else {
        console.log('status 401');
        return res.sendStatus(401);
      }
    }
  } catch (error) {
    // console.log(error);
    next(error)
  }
});

// access to secured route with token
router.get('/securedpage', verifyToken, async function (req, res, next) {
  console.log('secured route');
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

//google oauth authentication
router.post('/oauth/google', passport.authenticate('googleToken', { session: false }), async (req, res, next) => {
  console.log('welcome to google oauth');
  const token = req.body.token
  console.log(token);
  res.json({ msg: 'logged in with google OAuth', user: req.user })
})

//unlink facebook from local user
router.post('/unlink_google', async (req, res, next) => {
  try {

    // Delete Google sub-object
    if (req.user.google) {
      req.user.google = undefined
    }
    // Remove 'google' from methods array
    const googleStrPos = req.user.methods.indexOf('google')
    if (googleStrPos >= 0) {
      req.user.methods.splice(googleStrPos, 1)
    }
    await req.user.save()

    // Return something?
    res.json({ 
      success: true,
      methods: req.user.methods, 
      message: 'Successfully unlinked account from Google' 
    });

  } catch (error) {
    next(err)
  }
})

//unlink facebook from local user
router.post('/unlink_facebook', async (req, res, next) => {
  try {
      // Delete Facebook sub-object
      if (req.user.facebook) {
        req.user.facebook = undefined
      }
      // Remove 'facebook' from methods array
      const facebookStrPos = req.user.methods.indexOf('facebook')
      if (facebookStrPos >= 0) {
        req.user.methods.splice(facebookStrPos, 1)
      }
      await req.user.save()
  
      // Return something?
      res.json({ 
        success: true,
        methods: req.user.methods, 
        message: 'Successfully unlinked account from Facebook' 
      });
  } catch (error) {
    next(error)
  }
})

//redirect to profile
router.get('/secret', passport.authenticate('jwt', { session: false }), async function (req, res, next) {
  console.log(`welcome to secret page *${req.user.email}*`);
  res.json({
    message: `welcome to secret page *${req.user.email}*`
  })
})

//logout user
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
    .populate({ path: 'local.surveys', populate: { path: 'userId' }, model: 'survey', select: '-__v' })
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
    .populate({ path: 'local.surveys', model: 'survey', select: '-__v' })
    .exec(function (err, user) {
      if (user) {
        res.status(200).send({
          id: user.local._id,
          email: user.local.email,
          password: user.local.password,
          surveys: user.local.surveys,
          answeredSurveys: user.local.answeredSurveys,
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




