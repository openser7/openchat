module.exports = function (app,  mongoose) {
    return {
		user:  require("./user" )(app, mongoose),
		conversation: require("./conversation")(app, mongoose),
		message: require("./message")(app, mongoose),
		userHistory: require("./userHistory")(app, mongoose),
		ticket : require("./ticket")(app,mongoose)
	};
};