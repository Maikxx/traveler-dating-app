import * as express from 'express'
import * as mongoose from 'mongoose'
import * as bcrypt from 'bcrypt'

import Profile from '../models/profile'

import { SessionType } from '../types/SessionType'
import { ProfileType } from '../types/ProfileType'

import validationRegex from '../utils/regex'
import handleHttpError from '../utils/handleError'
import errorMessages from '../utils/errorMessages'

/*
Controller that handles signing new users up.

1. The data gets tested, before it is stored in Mongo.
2. There are checks to see if a Profile already exists, if the data is valid and if the user filled in everything the right way.
3. If everything succeeds the new user will be stored in the database and the user will be redirected to the questionaire page.
*/

function handleSignUp (req: express.Request & {session: SessionType}, res: express.Response) {
    const cusErr = {
        redirectTo: '/',
        scope: 'sign_up',
        logOut: false,
    }

    const {
        fullName,
        email,
        password,
        repeatPassword,
        ownGender,
        lookingForGender,
    } = req.body

    if (
        email && email.length && validationRegex.email.test(email) &&
        fullName && fullName.length &&
        password && password.length && validationRegex.password.test(password) && repeatPassword === password &&
        ownGender && ownGender.length &&
        lookingForGender && lookingForGender.length
    ) {
        Profile.findOne({ email: email.toLowerCase() })
            .then((user: ProfileType) => {
                if (user) {
                    handleHttpError(req, res, 409, cusErr.redirectTo, cusErr.scope, errorMessages.mailExists, false)
                } else {
                    bcrypt.hash(req.body.password, 10, (error: NodeJS.ErrnoException, hash: string) => {
                        if (error) {
                            handleHttpError(req, res, 500, cusErr.redirectTo,
                                cusErr.scope, errorMessages.serverError, cusErr.logOut, error)
                        } else {
                            const newUser = new Profile({
                                _id: new mongoose.Types.ObjectId(),
                                fullName,
                                firstName: fullName && fullName.length && fullName.substr(0, fullName.indexOf(' ')),
                                email: email.toLowerCase(),
                                password: hash,
                                ownGender,
                                matchSettings: {
                                    lookingForGender,
                                },
                                hasFinishedQuestionaire: false,
                            })

                            newUser.save()
                                .then((result: ProfileType) => {
                                    req.session.userId = result._id
                                    req.session.error = null

                                    res.status(200).redirect(`/questionaire`)
                                })
                                .catch((error: mongoose.Error) => {
                                    handleHttpError(req, res, 500, cusErr.redirectTo,
                                        cusErr.scope, errorMessages.serverError, cusErr.logOut, error)
                                })
                        }
                    })
                }
            })
            .catch((error: mongoose.Error) => {
                handleHttpError(req, res, 500, cusErr.redirectTo,
                    cusErr.scope, errorMessages.serverError, cusErr.logOut, error)
            })
    } else {
        handleHttpError(req, res, 412, cusErr.redirectTo, cusErr.scope, errorMessages.requiredFieldMissingOrInvalid, cusErr.logOut)
    }
}

export default handleSignUp
