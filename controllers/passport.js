const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const User = require('../models/userModel')
const GooglePlusTokenStrategy = require("passport-google-token").Strategy;
const FacebookTokenStrategy = require('passport-facebook-token')
const tokens = require('./jwt')

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('Authorization'),
    secretOrKey: 'secret_key'
}, async function (payload, done) {
    try {
        //find the user specified in token
        const user = await User.findById(payload.sub)
        //if user doesen't exist handle it
        if (!user) {
            return done(null, false)
        };
        //otherwise return the user
        return done(null, user)

    } catch (error) {
        return done(error, false)
    };
}));

passport.serializeUser(function (user, done) {
    console.log(user);
    done(null, user)
});


//login with passport-local-strategy
passport.use('local', new LocalStrategy({
    usernameField: 'email'
}, async function (email, password, done) {
    try {
        const user = await User.findOne({ 'local.email': email });
        if (!user) {
            console.log('user does not exist');
            return done(null, false, { error: 'user not found in db' });
        }
        const validate = await user.isValidPassword(password)
        if (!validate) {
            // console.log('no match', validate);
            return done(null, false, { error: 'passwords dont match' });
        }
        if (user.local.active === false) {
            return done(null, false, { error: 'account is not yet activated!' })
        }
        return done(null, user, { success: `logged in successfully` })

    } catch (error) {
        return done(error, false)
    }

}));


//Google OAuth Strategy
passport.use('googleToken', new GooglePlusTokenStrategy({
    clientID: tokens.oauth.google.clientID,
    clientSecret: tokens.oauth.google.clientSecret,
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {

        // console.log('accessToken => ', accessToken);
        // console.log('refreshToken => ', refreshToken);
        // console.log("profile => ", profile);

        //check weher this user exists already in DB
        if (req.user) {
            // We're already logged in, time for linking account!
            // Add Google's data to an existing account
            req.user.methods.push('google')
            req.user.google = {
                id: profile.id,
                email: profile.emails[0].value
            }
            await req.user.save()
            return done(null, req.user);
        } else {
            let existingUser = await User.findOne({ "google.id": profile.id })
            if (existingUser) {
                return done(null, existingUser)
            };
            // Check if we have someone with the same email
            existingUser = await User.findOne({ "local.email": profile.emails[0].value })
            if (existingUser) {
                // We want to merge google's data with local auth
                existingUser.methods.push('google')
                existingUser.google = {
                    id: profile.id,
                    email: profile.emails[0].value,
                    surveys: existingUser.google.surveys,
                    answeredSurveys: existingUser.google.answeredSurveys
                };
                await existingUser.save()
                return done(null, existingUser);
            }
            // if new account
            const newUser = new User({
                method: 'google',
                google: {
                    id: profile.id,
                    email: profile.emails[0].value
                }
            });

            await newUser.save()
            return done(null, newUser)
        }

    } catch (error) {
        return done(error, false, error.message)
    }
}));

//Facebook token Strategy

passport.use('facebookToken', new FacebookTokenStrategy({
    clientID: tokens.oauth.facebook.clientID,
    clientSecret: tokens.oauth.facebook.clientSecret,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // console.log('profile', profile);
        // console.log('accessToken', accessToken);
        // console.log('refreshToken', refreshToken);

        if (req.user) {
            // We're already logged in, time for linking account!
            // Add Facebook's data to an existing account
            req.user.methods.push('facebook')
            req.user.facebook = {
                id: profile.id,
                email: profile.emails[0].value
            }
            await req.user.save();
            return done(null, req.user);
        } else {
            // We're in the account creation process
            let existingUser = await User.findOne({ "facebook.id": profile.id });
            if (existingUser) {
                return done(null, existingUser);
            }

            // Check if we have someone with the same email
            existingUser = await User.findOne({ "local.email": profile.emails[0].value })
            if (existingUser) {
                // We want to merge facebook's data with local auth
                existingUser.methods.push('facebook')
                existingUser.facebook = {
                    id: profile.id,
                    email: profile.emails[0].value,
                    surveys: existingUser.facebook.surveys,
                    answeredSurveys: existingUser.facebook.answeredSurveys
                }
                await existingUser.save()
                return done(null, existingUser);
            }

            const newUser = new User({
                methods: ['facebook'],
                facebook: {
                    id: profile.id,
                    email: profile.emails[0].value
                }
            });

            await newUser.save();
            done(null, newUser);
        }
    } catch (error) {
        done(error, false, error.message);
    }
}));
