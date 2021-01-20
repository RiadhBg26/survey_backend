const express = require('express')
const router = express.Router()
const User = require('../models/userModel')
const Jwt = require('jsonwebtoken')
const randtoken = require('rand-token');
const passport = require('passport')
require('../controllers/passport')
require('dotenv').config()
const nodeMailer = require('nodemailer');

const SECRET = 'secret_key'
const refreshTokens = []

signToken = (user) => {
  return Jwt.sign({
    iss: 'logging token',
    sub: user,
  }, 'secret_key', { expiresIn: '24h' });
};

tokenRefresh = (user) => {
  return Jwt.sign({
    iss: 'refresh token',
    sub: user,
  }, 'refresh_key', { expiresIn: '24h' });
};

function verifyAuthToken(req, res, next) {
  try {
    const authToken = req.params.token;
    // req.headers['authorization'] = authToken;
    // console.log('token', authToken);
    if (!authToken) {
      return res.status(401).send('Unauthorized request')
    }
    // let token = req.headers.authorization.split(' ')[1]
    if (authToken === 'null') {
      return res.status(401).send('Unauthorized request')
    }
    Jwt.verify(authToken, 'secret_key', function (err, payload) {
      if (err || !payload) {
        return res.status(401).send('Unauthorized request');
      }
    });
    next()
  } catch (error) {
    next(error)
    console.log(error);
    return res.json({ message: error.message })
  }
}
//verify token
var decodedToken = '';
async function verifyToken(req, res, next) {
  const token = await req.query.token || req.params.token;
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

const transporter = nodeMailer.createTransport({
  service: 'gmail',
  secure: false,
  port: 3000,
  auth: {
    user: process.env.email,
    pass: process.env.password
  },
  tls: {
    rejectUnauthorized: false
  }
});

//signup user
router.post('/signup', async function (req, res, next) {
  // const user = new User()
  // const email = user.local.email = req.body.email
  // const password = user.local.password = req.body.password
  // const temporaryToken = user.local.temporaryToken = req.body.temporaryToken
  const { email, password } = req.body;


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
      .then(res.status(200).json({
        success: 'Local user merged with google/facebook user',
        user: foundUser
      }));
  }
  //if not merged create new user
  const newUser = new User({
    methods: ['local'],
    local: {
      email: email,
      password: password,
      temporaryToken: signToken(req.body)
    }
  });

  //generate a token
  // const token = signToken(newUser)

  const url = "http://localhost:3000/activate/"
  const MailOptions = {
    from: 'noreply@hello.com',
    to: newUser.local.email,
    subject: `Email Confirmation`,
    text: 'Hello' + newUser.local.email + 'Please click the link below to confirm your email',
    html: 'Hello<strong' + newUser.local.email +
      '</strong>, <br><br>Please click on the link below to activate your account: </br></br>' +
      '<a href="http://localhost:3000/api/users/activate/' + newUser.local.temporaryToken + '"> http://localhost:3000/activate/' + newUser.local.temporaryToken + '</a>'
  };
  transporter.sendMail(MailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent to' + newUser.local.email);
    }
  });

  //save user in db
  await newUser.save().then(function (user) {
    res.json({
      message: 'Account created please check your email for activation !',
      user: user,
      // token: token
    })
  });

});

router.get('/activate/:token', async function (req, res, next) {
  console.log('here');
  try {
    const token = req.params.token;
    User.findOne({ "local.temporaryToken": token }, function (err, user) {
      if (err) throw err;
      Jwt.verify(token, 'secret_key', async function (err, tokendata) {
        if (err) {
          return res.status(401).json({ message: 'Activation link has expired', });
        }
        if (!user) {
          // return res.status(401).json({ message: 'Your account is already activated!' });
          return res.redirect('http://localhost:4200')
        }
        if (tokendata) {
          decodedToken = tokendata;
          user.save(function (err) {
            if (err) return console.log(err);
            const MailOptions = {
              from: process.env.email,
              to: user.local.email,
              subject: `Account activated!`,
              text: 'Account successfully activated!',
              html: `<br><h1> Your account has been activated successfully! </h1> </br>`
            };
            transporter.sendMail(MailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log('Success email sent to ' + user.local.email);
              }
            });
            user.local.temporaryToken = false;
            user.local.active = true;
            user.save();
            return res.json({ success: true, message: 'Account activated!' })
          });
        }
      })
    })
  } catch (error) {
    console.log(error);
  }
});

//login user
var msg = ''
router.post('/login', function (req, res, next) {
  passport.authenticate('local', { failWithError: true }, async function (err, user, info) {
    
    if (!user) {
      return res.status(400).json(info.error)
    }
    
    if (err) {
      return res.status(400).json(info.error )
    };
    if (!user) {
      return res.status(400).json(info.error )
    };
    
    const token = await signToken(user)
    const refreshToken = await tokenRefresh(user)
    refreshTokens.push(refreshToken)
    return res.status(200).json({
      message: info.success,
      userId: user._id,
      token: token,
      refreshToken: refreshToken
    });

  })(req, res, next)
})


//forgot username
router.post('/reset-username', async (req, res, next) => {
  await User.findOne({ 'local.email': req.body.email }).select().exec(function (err, user) {
    if (err) return res.status(400).json({ success: false, message: err });
    if (!user) return res.status(400).json({ success: false, message: 'email was not found' });
    const MailOptions = {
      from: 'noreply@hello.com',
      to: user.local.email,
      subject: `Username request`,
      text: 'Hello' + user.local.email,
      html: 'Hello<strong' + user.local.email +
        '</strong>, <br><br>This is your forgotten username, please make sure to safely save it </br></br>' +
        "<h3> *** " + user.local.email + " *** </h3>"
    };
    transporter.sendMail(MailOptions, function (error, info) {
      if (error) {
        console.log('==> ', error);
      } else {
        console.log('Email sent to' + user.local.email);
        return res.status(200).json({ message: 'A link has been sent to your email, please click on it to reset your password' })
      };
    });
    return res.status(200).json({ message: 'username has been sent to email' });
  })
});

//reset password
router.post('/reset-password', async (req, res, next) => {
  await User.findOne({ 'local.email': req.body.email }).select().exec(function (err, user) {
    if (err) throw err
    if (!user) return res.status(400).json({ success: false, message: 'no user found with this email, Please enter a valid email.' });
    if (!user.local.active) return res.status(401).json({ success: false, message: 'Account has not yet been activated, please activate your account first!' });
    user.local.resetToken = signToken(req.body)
    // user.local.resetToken = Jwt.sign(req.body, 'secret_key', { expiresIn: '24h' })
    user.save(function (err) {
      if (err) return res.status(400).json({ success: false, message: err });
      const MailOptions = {
        from: 'noreply@hello.com',
        to: user.local.email,
        subject: `Password reset`,
        text: 'Hello' + user.local.email + 'Please click the link below to reset your password',
        html: 'Hello<strong' + user.local.email + '</strong> ' +
          ' <br><br>Please click on the link below to reset your password: </br></br>' +
          '<br><br>' + ' <h2> <button> <a href="http://localhost:3000/api/users/reset/' + user.local.resetToken + '"> Reset password </button> </h2>  </br></br> '
      };
      transporter.sendMail(MailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent to' + newUser.local.email);
          return res.status(200).json({ message: 'Please check your email for password reset link' })
        }
      });
      return res.status(200).json({
        message: 'Please check your email for password reset link',
        resetToken: user.local.resetToken
      })
    });
  })
});

//verify query token to redirect to the reset-password page
router.get('/reset/:token', verifyToken, async (req, res, next) => {
  await User.findOne({ 'local.resetToken': req.params.token }).select().exec(function (err, user) {
    if (err) throw err;
    const token = req.params.token;
    Jwt.verify(token, 'secret_key', async function (err, tokendata) {
      if (err || !user) {
        console.log(err);
        return res.status(401).json({ success: false, message: 'Reset link has expired', });
      };
      return res.redirect(`http://localhost:4200/reset/${user.local.resetToken}`);
      // res.sendFile('/login.html', {root: __dirname })
    });
  });
});

//create the new password
router.put('/save-password', verifyToken, async (req, res, next) => {
  const email = decodedToken.sub.local.email;
  await User.findOne({ 'local.email': email }).select().exec(async function (err, user) {
    if (err) return res.status(400).json({ success: false, message: err });
    if (!user) return res.status(400).json({ success: false, message: 'no user found with this email' })
    if (req.body.password) {
      user.local.password = req.body.password;
      user.local.resetToken = false;
      await user.save(function (err) {
        if (err) {
          return res.json({ success: false, message: err });
        } else {
          const MailOptions = {
            from: 'noreply@hello.com',
            to: user.local.email,
            subject: `Password reset successfully !`,
            text: 'Hello' + user.local.email + 'Your password has been successfully reset!',
            html: 'Hello<strong' + user.local.email +
              '</strong>, <br><br> Your password has been successfully reset! </br></br>' +
              '<button> <a href="http://localhost:4200/login">Login</button>'
          };
          transporter.sendMail(MailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent to' + newUser.local.email);
              return res.status(200).json({ message: 'Your password has been successfully reset! ' })
            }
          });
          return res.json({ success: true, message: 'Your assword has been successfully reset !' })
        }

      })
    }
  })
})

// refresh token
router.post('/refresh', async function (req, res, next) {
  try {
    // console.log('here');
    const refreshToken = req.body.refreshToken;
    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
      // console.log("401");
      return res.status(401).json({ error: 'user not authenticated, token expired' })
    }
    Jwt.verify(refreshToken, 'refresh_key', (err, payload) => {
      if (err) {
        console.log(err.error);
      }
      req.user = payload.sub
      const token = signToken(req.user);
      // console.log('token refreshed');
      return res.json({ token: token })
    })

  } catch (error) {

  }
});

// access to secured route with token
router.get('/securedpage', verifyToken, async function (req, res, next) {
  // console.log('secured route');
  return res.status(200).json({
    user: decodedToken.user,
    message: 'Survey App'
  });
});

//redirect to profile
router.get('/secret', passport.authenticate('jwt', { session: false }), async function (req, res, next) {
  console.log(`welcome to secret page *${req.user.email}*`);
  res.json({
    message: `welcome to secret page *${req.user.email}*`
  });
});

//google oauth authentication
router.post('/oauth/google', passport.authenticate('googleToken', { session: false }), async (req, res, next) => {
  console.log('welcome to google oauth');
  // console.log(req.user);
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

// failure page
router.get('failure', function (req, res) {
  console.log('failure page!');
  res.json({ error: 'account is not yet activated!' })
})
module.exports = router




