const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const Survey = require('../models/surveyModel');
const User = require('../models/userModel');
const { use } = require('passport');
const user = require('../models/userModel');
const { findOneAndRemove } = require('../models/userModel');

router.get('/', function (req, res) {
    Survey.find({})
        .select('-__v')
        .populate({ path: 'userId', model: 'user', select: '-__v' })
        .exec(function (error, surveys) {
            res.send({
                count: surveys.length,
                surveys: surveys
            })
        });
});

//____________________________Get single Expert __________________________

router.get('/:id', function (req, res) {
    // console.log('GET request');
    id = req.params.id;
    Survey.findOne({ _id: id })
        .select(' -__v')
        // .populate('specialty', {'_id ': 0})
        //   .populate({ path: 'userId', model: 'user', select: '-__v' })
        .exec(function (err, survey) {
            if (survey) {
                // console.log('survey => ',survey);
                res.status(200).send({
                    id: survey._id,
                    title: survey.title,
                    description: survey.description,
                    choices: survey.choices,
                    yesPercentage: survey.yesPercentage,
                    noPercentage: survey.noPercentage
                });
            } else {
                res.json({ message: `No survey found with id : ${id}` })
                //   console.log('bad');
            }
        });
});

router.post('', function (req, res, next) {
    let user = ''
    try {
        Survey.create(req.body).then(async function (survey) {
            //console.log(survey)
            user = await User.findById(survey.userId)
            // console.log("'id => ", user);
            user.local.surveys.push(survey._id)
            user.google.surveys.push(survey._id)
            user.facebook.surveys.push(survey._id)
            await user.save()
            survey.yesPercentage = 0
            survey.noPercentage = 0
            survey.save()
            res.send({
                msg: 'survey created successfully !',
                survey: survey
            })
        })
    } catch (error) {
        return next(error)
    }
})


const limiter = rateLimit({
    windowMs: 1000 * 60 * 60 * 24,  // 24 hours,
    max: 5, // number of requests 
    message: {
        status: 429,
        error: 'You are doing that too much.'
    }
})



router.put('/:id', function (req, res) {
    var totalChoices = 0, noChoices = 0, yesChoices = 0, yesPercentage = 0, noPercentage = 0
    var found = false
    Survey.findByIdAndUpdate({ _id: req.params.id }, req.body.choice).then(async function (survey) {
        let user = await User.findById(survey.userId)
        // console.log('id => ',user);
        answeredSurveys = user.local.answeredSurveys
        console.log(answeredSurveys.length);
        if (answeredSurveys.length !== 0) {
            // console.log('one');
            for (let i = 0; i < answeredSurveys.length; i++) {
                if (answeredSurveys[i] == req.params.id) {
                    // console.log(answeredSurveys[i], req.params.id);
                    found = true
                }
            }
            if (found == false) {

                answeredSurveys.push(req.params.id)
                survey.choice.push(req.body.choice)
                totalChoices = survey.choice.length
                if (yesChoices !== 0) {
                    yesChoices = 0
                }
                for (let i = 0; i < totalChoices; i++) {
                    if (survey.choice[i] == 'yes') {
                        yesChoices++
                        // console.log('yes => ',yesChoices);
                    }
                    if (survey.choice[i] == 'no') {
                        noChoices++
                        // console.log('no => ',noChoices);
                    }
                }

                yesPercentage = (yesChoices / totalChoices) * 100
                noPercentage = (noChoices / totalChoices) * 100
                survey.yesPercentage = yesPercentage
                survey.noPercentage = noPercentage

                survey.save();
                user.save()

                res.send({
                    message: 'answer saved !',
                    survey: survey
                })
                return

            } else {
                res.send({
                    message: 'you already reacted to this survey !',
                })
            }

        } else {
            // console.log('two');
            answeredSurveys.push(req.params.id)
            survey.choice.push(req.body.choice)
            totalChoices = survey.choice.length
            if (yesChoices !== 0) {
                yesChoices = 0
            }
            for (let i = 0; i < totalChoices; i++) {
                if (survey.choice[i] == 'yes') {
                    yesChoices++
                    // console.log('yes => ',yesChoices);
                }
                if (survey.choice[i] == 'no') {
                    noChoices++
                    // console.log('no => ',noChoices);
                }
            }

            yesPercentage = (yesChoices / totalChoices) * 100
            noPercentage = (noChoices / totalChoices) * 100
            survey.yesPercentage = yesPercentage
            survey.noPercentage = noPercentage

            survey.save();
            user.save()

            res.send({
                message: 'answer saved !',
                survey: survey
            })

        }
        // console.log(survey);
        // console.log(yesPercentage, noPercentage);
        // console.log('ip address => ', req.ip)
    });
});



router.delete('/:id', function (req, res) {
    Survey.findByIdAndDelete({ _id: req.params.id }).then(async function (data) {
        let user = await User.findById(data.userId)
        let surveys = user.local.surveys
        Survey.findByIdAndDelete(surveys[0])
        
        res.send(data)
    });
});

module.exports = router