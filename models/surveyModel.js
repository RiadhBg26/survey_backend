const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const SurveySchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref:'user'},
    title: {type: String},
    description: {type: String},
    choice: [{type: String}],
    yesPercentage:{type: Object},
    noPercentage:{type: Object}
});
const survey = mongoose.model('survey', SurveySchema);
module.exports = survey;