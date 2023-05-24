import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from '../models/user.server.model';
import * as film from '../models/film.server.model';
import * as reviews from '../models/film.review.server.model';
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import * as schemas from '../resources/schemas.json';
import {validate} from "../validator/validator";
import {addReviews} from "../models/film.review.server.model";

const getReviews = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        if (isNaN(+id)) {
            res.statusMessage = "Bad request. Invalid information";
            res.status(400).send();
            return;
        }
        const filmy = await film.getFilmById(+id);
        if (filmy.length === 0) {
            res.statusMessage = "Not Found. No film with id";
            res.status(404).send();
            return;
        }
        const review = await reviews.getReviews(+id);
        res.statusMessage = "OK";
        res.status(200).send(review);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const addReview = async (req: Request, res: Response): Promise<void> => {
    const validation = await validate(
        schemas.film_review_post,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }
    try{
        const id = req.params.id;
        const now = new Date();
        const rating = req.body.rating;
        const review = req.body.review;
        const token = req.header("X-Authorization");
        const result = await users.findUserIdByToken(token);
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            if (isNaN(+id)) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
            const filmy = await film.getFilmById(+id);
            if (filmy.length === 0) {
                res.statusMessage = "Not Found. No film found with id";
                res.status(404).send();
                return;
            }
            if (rating < 1 || rating > 10 || rating % 1 !== 0) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
            if (new Date(filmy[0].release_date) > now) {
                res.statusMessage = "Forbidden. Cannot review your own film, or cannot post a review on a film that has not yet released";
                res.status(403).send();
                return;
            }

            if (filmy[0].director_id === result[0].id) {
                res.statusMessage = "Forbidden. Cannot review your own film, or cannot post a review on a film that has not yet released";
                res.status(403).send();
                return;
            }
            await reviews.addReviews(+id, result[0].id, rating, review);
            res.statusMessage = "Created";
            res.status(201).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}



export {getReviews, addReview}