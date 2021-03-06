import * as fs from 'fs'
import * as express from 'express'

import Profile from '../models/profile'

import { SessionType } from '../types/SessionType'
import { ProfileType } from '../types/ProfileType'
import { CustomErrorType } from '../types/customErrorType'

/*
Route for deleting users.

Note: The reason this is a post request has to do with the fact this has to have the user id from the session to delete.
I did not want to mess with Socket.io.
Note 2: Deleting with the mockData crashes the server, because it is trying to delete the only image (available-traveler.jpg) three times.
With real data this won't happen, because all the images have their own id.

1. The code looks for a valid profile and gets it from the database.
2. Delete all the profile images of this user, if he has any.
3. Delete the users account.
4. Destroy the users session.
*/

async function handleDeleteAccount (req: express.Request & {session: SessionType}, res: express.Response, next: express.NextFunction) {
    const cusErr = {
        req,
        res,
        code: 401,
        redirectTo: '/',
        scope: 'delete_account',
        message: 'You need to be logged in to delete your account!',
        logOut: true,
    }

    if (req.session && req.session.userId) {
        const { userId } = req.session

        try {
            const myProfile = await Profile.findOne({ _id: userId }) as ProfileType
            const { profileImages } = myProfile

            if (profileImages && profileImages.length) {
                await profileImages.forEach(async (imagePath: string) => {
                    await fs.unlink(imagePath, (error: NodeJS.ErrnoException) => {
                        if (error) {
                            next(error)
                        }
                    })
                })

                deleteAccount(req, res, next, cusErr, userId)
            } else {
                deleteAccount(req, res, next, cusErr, userId)
            }
        } catch (error) {
            next(error)
        }
    } else {
        next(cusErr)
    }
}

// tslint:disable-next-line:ter-max-len
async function deleteAccount(req: express.Request & {session: SessionType}, res: express.Response, next: express.NextFunction, cusErr: CustomErrorType, userId: string) {
    try {
        await Profile.remove({ _id: userId })

        console.log('Deleting')

        req.session.destroy((error: NodeJS.ErrnoException) => {
            if (error) {
                next(error)
            } else {
                res.status(201).redirect('/')
            }
        })
    } catch (error) {
        next(error)
    }
}

export default handleDeleteAccount
