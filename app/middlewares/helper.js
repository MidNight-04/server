exports.checkEmailPhone = function (params) {
    let validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    let phoneno = /^\d{10}$/;

    if (params.match(validRegex)) {
        return 'email';
    } else if (params.match(phoneno)) {
        return 'phone';
    }
    return 0;

}