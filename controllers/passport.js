const passport = require('passport');
const User = require('../models/userModel')
const LocalStrategy = require('passport-local').Strategy;

//Create a passport middleware to handle user registration
passport.use('signup', new LocalStrategy({
  usernameField : 'email',
  passwordField : 'password'
}, async (email, password, done) => {
    try {
      //Save the information provided by the user to the the database
      const user = await User.create({ email, password });
      //Send the user information to the next middleware
      return done(null, user);
    } catch (error) {
      done(error);
    }
}));


//Create a passport middleware to handle User login
passport.use('local', new LocalStrategy({
  usernameField : 'email',
  passwordField : 'password'
}, async (email, password, done) => {

    //Find the user associated with the email provided by the user
    const user = await User.findOne({ email });
    if( !user ){
      //If the user isn't found in the database, return a message
      
      return done(null, false, { message : 'User not found'});
    }
    //Validate password and make sure it matches with the corresponding hash stored in the database
    //If the passwords match, it returns a value of true.
    const validate = await user.isValidPassword(password);
    console.log(password);
    // if( !validate ){
    //   // console.log(email, password, validate);
    //   return done(null, false,{ message : 'Wrong Password'});
      
    // }
    //Send the user information to the next middleware
    return done(null, user, validate, { message : 'Logged in Successfully'});
}));


const JWTstrategy = require('passport-jwt').Strategy;
//We use this to extract the JWT sent by the user
const ExtractJWT = require('passport-jwt').ExtractJwt;

//This verifies that the token sent by the user is valid
passport.use(new JWTstrategy({
  //secret we used to sign our JWT
  secretOrKey : 'top_secret',
  //we expect the user to send the token as a query parameter with the name 'secret_token'
  jwtFromRequest : ExtractJWT.fromUrlQueryParameter('secret_token')
}, async (token, done) => {
  try {
    //Pass the user details to the next middleware
    return done(null, token.user);
  } catch (error) {
    done(error);
  }
}))

module.exports = passport


















// ------------------------------------------------
// ---------------------------------------------------


// passport.use(new BearerStrategy(
//   //options for the strategy
//   function(username, password, done) {
//     User.findOne({ username: username }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));

// ------------------------------------------------
// ---------------------------------------------------




// ------------------------------------------------
// ---------------------------------------------------
// passport.use(new BearerStrategy(
//   function(token, done) {
//     User.findOne({ token: token }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) { return done(null, false); }
//       return done(null, user, { scope: 'all' });
//     });
//   }
// ));

// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });

// passport.deserializeUser(function(id, done) {
//   User.getUserById(id, function(err, user) {
//     done(err, user);
//   });
// });
// ------------------------------------------------
// ---------------------------------------------------

