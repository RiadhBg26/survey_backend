var authRoutes = require('express').Router()
// const { check } = require('express-validator')
var validators = require('../validators')
// const Auth = require('../controllers/auth')
// const validate = require('../middlewares/validate')
const emailSender = require('../helpers/emailSender')
const User = require('../models/User')
const StatUser = require('../models/StatUser')
const authenticate = require('../middlewares/authenticate')
const userController = require('../controllers').user
const createStat = require('../controllers').stats
const config = require('../../config');
const mailjet = require ('node-mailjet').connect(config.mjApiKeyPublic, config.mjApiKeyPrivate)
/**
 * User registration service
 */
authRoutes.post('/register', validators.userValidator.validatePostData, async (req, res, next) => {
  // Make sure this account doesn't already exist
  const email = req.body.email.toLowerCase()
  User.findOne({
      email: email
    })
    .then(user => {
      if (user)
        return res.json({
          status: 401,
          message: 'Cet email est déjà utilisé.'
        })
    })
  // Create and save the user
  const newUser = new User(req.body)
  //generate random string with 6 char
  let code = Date.now().toString();
  let confirmationCode = code.substr(-4);
  //create user confirmationCode
  //let today= moment().add(7,'days').locale("fr").format('L')
  // moment(Date.now()).locale("fr").format('L')
  newUser.confirmationCode = confirmationCode
  newUser.validationDate = Date.now()
  await newUser.save()
    .then(user => {
if(req.body.newsletter==="true"){ 
    const request = mailjet
      .post("contact", {'version': 'v3'})
      .request({
          "IsExcludedFromCampaigns":"false",
          "Email":email
        })
    request
      .then((result) => {
        const body= result.body.Data[0]
        const requestList = mailjet
	.post("listrecipient", {'version': 'v3'})
	.request({
      "IsUnsubscribed":true,
      "ContactID":body.ID,
      "ListID":config.mjListId,
    })
      })
      .catch((err) => {
        console.log(err)
      })}
      emailSender.sendEmail(email, confirmationCode, config.emailHeader, config.emailSubject,true,config.base_url
        ).then((response) => {
        // email sent with sucess
        if (response) {

          //save email log
          next()
        }
      }).catch(err => console.log('email not sent:', err)
        //log email not sent
      )
     return res.json({
        status: 200,
        message: 'sucess',
        data: user
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        statuss: 500,
        message: err.message
      })
    })
})
/**
 * User login service
 */
authRoutes.post('/login', validators.authValidator.validateLogin, async (req, res) => {
  let email = req.body.email.toLowerCase()
  User.findOne({
      email: email
    })
    .then(async user => {
      if (!user) return res.json({
        status: 401,
        message: 'Votre identifiant ou mot de passe est incorrect.',
        reason: 'erroned'
      })
      if (req.body.code) {

        // validate code
        if (user.compareCode(req.body.code) !== 'valid') {return res.json({
          status: 401,
          message: user.compareCode(req.body.code) + ' code',
          reason: user.compareCode(req.body.code)
        })
      }
        else {
          createStat.addStatModel('free',user._id)
        }
      } else if (req.body.password) {
        //check if the account is active
        if (!user.active){
          if (!user.comparePassword(req.body.password))
          return res.json({
            status: 401,
            message: 'Votre identifiant ou mot de passe est incorrect.',
            reason: 'erroned'
          })
          else
          return res.json({
            status: 401,
            message: 'Account not confirmed yet ',
            reason: 'inactive'
          })
        }
        // validate password
        else if (!user.comparePassword(req.body.password))
          return res.json({
            status: 401,
            message: 'Votre identifiant ou mot de passe est incorrect.',
            reason: 'erroned'
          })
      }
      // Login successful, write token, and send back user
      // TO DO missing a test if code or password don't exist
      user.active = true
      await user.save()
      let response = {
        ...user.getLoginData()
      } 
      const expire = "365d"
      // generate a token with current device id and make all the rest deviceIds inactive
      response.token = user.generateJWT(req.body.deviceId, expire)

      res.json({
        status: 200,
        message: 'sucess',
        data: response
      })
    })
    .catch(err => res.json({
      status: 500,
      message: err.message
    }))
})
/**
 * User logout service
 */
authRoutes.post('/logout', authenticate, async (req, res) => {
  // Update the table of linked devices
  let newLinkedDevicesArray = req.user.linkedDevices.map(e => {
    e.status = 'inactive'
    return e
  })
  await User.updateOne({
    _id: req.user._id
  }, {
    $set: {
      linkedDevices: newLinkedDevicesArray
    }
  })
  return res.json({
    message: 'User logged out successfully'
  })
})

// TO DO review this controller : I don't like it :/
authRoutes.post('/password', async (req, res, next) => {
  let randomPassword
  let email = req.body.email.toLowerCase()
  let user = await User.findOne({
    email: email
  })

  if (!user)
    return res.status(401).json({
      msg: 'Votre identifiant ou mot de passe est incorrect.'
    })

  // change password randomly , sent email tp the user 
  let randomPassword1 = randomString(8, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ').substring(2, 5);
  let randomPassword2 = randomString(8, '0123456789').substring(2, 5);
  randomPassword = randomPassword1 + randomPassword2
  //update user password
  user.password = randomPassword
  user.tempPassword=true
  await user.save()

  await emailSender.sendEmail(email, randomPassword, 'mot de passe',true,config.base_url
  ).then((response) => {
    // email sent with sucess
    if (response) {
      //next()
      res.status(200).json({
        success: true,
        message: "new password sent by email "
      })
    }
  })
})

authRoutes.post('/register/resend', async (req, res, next) => {
  if (!req.body.email)
    res.boom.badData('Missing email')
  else {
    // Make sure this account doesn't already exist
    let email = req.body.email.toLowerCase()
    User.findOne({
        email: email
      })
      .then(async user => {
        if (!user)
          return res.boom.resourceGone("user not found")
        else {
                 //generate random string with 6 char
             let code = Date.now().toString();
             let confirmationCode = code.substr(-4);
             //create user confirmationCode
          user.confirmationCode = confirmationCode
          user.validationDate = Date.now()

          await user.save()

          emailSender.sendEmail(email, user.confirmationCode, ' code de confirmation','Confirmation de création de compte',true,config.base_url).then((response) => {
            // email sent with sucess
            if (response) {
              //save email log
              next()
            }
          }).catch(err => console.log('email not sent :',err)
            //log email not sent
          )
        }
      })
    // send response asychrounsly

    return res.json({
      success: true,
      message: "validation code sent"
    })
  }

})
//forgot password for user
authRoutes.post('/user/reset/password', async (req, res) => {
  if (!req.body.email)
      res.boom.badData('Missing email adress')
  else {
      try {
        let email = req.body.email.toLowerCase()
          if (await userController.processForgotPassword(email,req.body.deviceId))
              res.json({
                  success: true,
                  message: "User identified and email is being sent"
              })
          else {
              res.boom.badRequest("User not found", {
                  type: "not-found"
              })
          }
      } catch (err) {
          res.boom.badImplementation(err)
      }
  }
})
function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
module.exports = authRoutes
