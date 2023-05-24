import {Request, Response} from "express";
import * as users from '../models/user.server.model';
import * as film from '../models/film.server.model';
import Logger from "../../config/logger";
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import * as schemas from '../resources/schemas.json';
import {getPool} from "../../config/db";
import test from "node:test";
import {findUserIdByToken, getUserById} from "../models/user.server.model";
import {validate} from "../validator/validator";
import * as querystring from 'querystring';
import * as url from "url";
import {
    addFilms,
    deleteFilm,
    deleteReview,
    getFilmById,
    getFilmByTitle,
    getGenre,
    searchFilms
} from "../models/film.server.model";
import path from "path";
import fs from "fs";

const viewAll = async (req: Request, res: Response): Promise<void> => {
    const startIndex = req.query.startIndex;
    const Count = req.query.count;
    const q = req.query.q || '';
    const genreIds = req.query.genreIds || [];
    const ageRatings = req.query.ageRatings || [];
    const directorId = req.query.directorId || '';
    const reviewerId = req.query.reviewerId || '';
    const sortBy = req.query.sortBy || 'RELEASED_ASC';
    const filters = [];
    const valid = ['G', 'PG', 'M', 'R13', 'R16', 'R18', 'TBC'];
    try {
        const validation = await validate(
            schemas.film_search,
            req.query);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        if (genreIds.length > 0) {
            if (!Array.isArray(genreIds)) {
                const genre = await getGenre(+genreIds);
                if (genre.length === 0) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send();
                    return;
                }
            } else {
                // @ts-ignore
                for (const genreId of genreIds) {
                    const genre = await getGenre(+genreId);
                    if (genre.length === 0) {
                        res.statusMessage = "Bad Request";
                        res.status(400).send();
                        return;
                    }
                }

            }
        }
        if (startIndex) {
            if (isNaN(+startIndex)) {

                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
        }
        if (Count) {
            if (isNaN(+Count)) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
        }
        if (ageRatings.length !== 0) {
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < ageRatings.length; i++) {
                // @ts-ignore
                if (!valid.includes(ageRatings[i])) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send();
                    return;
                }
            }
        }

        let sql = 'SELECT film.id as filmId, title, genre_id as genreId, director_id as directorId, first_name as directorFirstName, last_name as directorLastName, release_date as releaseDate, age_rating as ageRating, CAST(COALESCE(ROUND(all_ratings.rating_avg, 1), 0) AS FLOAT) as rating FROM film';

        if (directorId) {
            sql += ` JOIN user ON film.director_id = user.id AND user.id = ${directorId}`;
        } else {
            sql += ' JOIN user ON film.director_id = user.id';
        }

        sql += ' LEFT JOIN (SELECT film_id, AVG(rating) as rating_avg FROM film_review GROUP BY film_id) AS all_ratings ON film.id = all_ratings.film_id';

        if (reviewerId) {
            sql += ` LEFT JOIN film_review on film.id = film_review.film_id`;
        } else {
            sql += ` LEFT JOIN film_review on film.id = film_review.film_id`;
        }

        if (q) {
            const q1 = '%' + q + '%';
            filters.push(`(title LIKE '${q1}' OR description like '${q1}')`);
        }

        if (genreIds.length !== 0) {
            const ids = Array.isArray(genreIds) ? genreIds : [genreIds];
            const genreIdString = ids.map(id => `${id}`).join(',');
            // tslint:disable-next-line:no-console
            filters.push(`film.genre_id IN (${genreIdString})`);

        }

        if (ageRatings.length !== 0) {
            const ratings = Array.isArray(ageRatings) ? ageRatings : [ageRatings];
            const ageRatingString = ratings.map(rating => `'${rating}'`).join(',');
            filters.push(`film.age_rating IN (${ageRatingString})`);

        }

        if (reviewerId) {
            filters.push(`film_review.user_id = ${reviewerId}`);
        }

        if (filters.length > 0) {
            sql += ` WHERE ${filters.join(' AND ')}`;
        }

        sql += ` GROUP BY film.id`;

        switch (sortBy) {
            case 'ALPHABETICAL_ASC':
                sql += ' ORDER BY title ASC, film.id ASC';
                break;
            case 'ALPHABETICAL_DESC':
                sql += ' ORDER BY title DESC, film.id ASC';
                break;
            case 'RELEASED_ASC':
                sql += ' ORDER BY release_date ASC, film.id ASC';
                break;
            case 'RELEASED_DESC':
                sql += ' ORDER BY release_date DESC, film.id ASC';
                break;
            case 'RATING_ASC':
                sql += ' ORDER BY rating ASC, film.id ASC';
                break;
            case 'RATING_DESC':
                sql += ' ORDER BY rating DESC, film.id ASC';
                break;
            default:
                sql += ' ORDER BY release_date ASC, film.id ASC';
                break;
        }

        const result = await film.searchFilms(sql);
        const count = result.length;

        if (Count && startIndex) {
            sql += ` LIMIT ${startIndex}, ${Count}`;
        } else if (startIndex) {
            sql += ` LIMIT ${startIndex}, ${count}`;
        } else if (Count) {
            sql += ` LIMIT ${0}, ${Count}`;
        } else {
            sql += ` LIMIT 0, ${count}`;
        }
        const films = await film.searchFilms(sql);
        // Your code goes here
        res.statusMessage = "OK";
        res.status(200).send({films, count} );
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        if (isNaN(+id)) {
            res.statusMessage = "Bad request. Invalid information";
            res.status(400).send();
            return;
        }
        const check = await getFilmById(+id);
        if (check.length === 0) {
            res.statusMessage = "Not Found. Not film with id";
            res.status(404).send();
            return;
        }

         let sql = `SELECT film.id AS filmId, title, description, genre_id as genreId, director_id as directorId, user.first_name AS directorFirstName, user.last_name AS directorLastName, release_date AS releaseDate, age_rating AS ageRating, runtime, CAST(ROUND(COALESCE(AVG(film_review.rating), 0), 1) AS FLOAT) AS rating, COUNT(film_review.id) AS numReviews`;
        sql += ` FROM film JOIN user ON film.director_id = user.id LEFT JOIN film_review ON film.id = film_review.film_id WHERE film.id = ${id}
            GROUP BY film.id`;

        const result = await film.searchFilms(sql);
        res.statusMessage = "OK";
        res.status(200).send(result[0]);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addOne = async (req: Request, res: Response): Promise<void> => {
    const validation = await validate(
        schemas.film_post,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }
    const token = req.header("X-Authorization");
    try{
        const title = req.body.title;
        const valid = ['G', 'PG', 'M', 'R13', 'R16', 'R18', 'TBC'];
        const description = req.body.description;
        const now = new Date();
        const releaseDate = req.body.releaseDate || now.toISOString();
        const genreId = req.body.genreId;
        const runtime = req.body.runtime;
        const ageRating = req.body.ageRating || "TBC";
        const checkTitle = await film.getFilmByTitle(title);
        const result = await findUserIdByToken(token);
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            // tslint:disable-next-line:no-console
            if (isNaN((new Date(releaseDate)).getTime())) {
                res.statusMessage = "Bad Request";
                res.status(400).send("invalid");
                return;
            }
            // tslint:disable-next-line:no-console
            if (new Date(releaseDate) < now) {
                res.statusMessage = "Forbidden. Film is not unique, or cannot release a film in the past";
                res.status(403).send();
                return;
            }
            const check = await getGenre(genreId);
            if (check.length === 0) {
                res.statusMessage = "Bad request";
                res.status(400).send();
                return;
            }

            if (checkTitle.length > 0) {
                res.statusMessage = "Forbidden. Film title is not unique, or cannot release a film in the past";
                res.status(403).send();
                return;
            }
            if (ageRating) {
                if (!valid.includes(ageRating)) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send();
                    return;
                }
            }
            if (genreId) {
                const genre = await getGenre(genreId);
                if (genre.length === 0) {
                    res.statusMessage = "Bad request. Invalid information";
                    res.status(400).send();
                    return;
                }
            }
            const films = await addFilms(title, description, releaseDate, genreId, runtime, ageRating, result[0].id);
            res.statusMessage = "Created";
            res.status(201).send({"filmId": films.insertId});

        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editOne = async (req: Request, res: Response): Promise<void> => {
    const validation = await validate(
        schemas.film_patch,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }
    const token = req.header("X-Authorization");
    const filters = [];
    const now = new Date();
    const title = req.body.title || null;
    const description = req.body.description || null;
    const runtime = req.body.runtime || null;
    const ageRating = req.body.ageRating || null;
    const genreId = req.body.genreId || null;
    const result = await users.findUserIdByToken(token);
    const id = req.params.id;
    const releaseDate = req.body.releaseDate || null;
    const valid = ['G', 'PG', 'M', 'R13', 'R16', 'R18', 'TBC'];
    try{
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
            const reviews = await searchFilms(`SELECT * from film_review where film_id = ${id}`);
            if (filmy.length === 0) {
                res.statusMessage = "Not Found. No film found with id";
                res.status(404).send();
                return;
            }

            if (filmy[0].director_id !== result[0].id) {
                res.statusMessage = "Forbidden. Only the director of the film may change it, cannot change the releaseDate since it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                res.status(403).send();
                return;
            }
            if (releaseDate) {
                if (isNaN((new Date(releaseDate)).getTime())) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send("invalid");
                    return;
                }
                // tslint:disable-next-line:no-console
                if (new Date(releaseDate) < now) {
                    res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                    res.status(403).send();
                    return;
                }

                if (new Date(filmy[0].release_date) < now) {
                    res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                    res.status(403).send();
                    return;
                }
            }

            if (reviews.length > 0) {
                res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                res.status(403).send();
                return;
            }

            if (title) {
                const checkTitle = await film.getFilmByTitle(title);
                if (checkTitle.length > 0) {
                    res.statusMessage = "Bad request. Invalid information";
                    res.status(400).send();
                    return;
                }
            }
            if (ageRating) {
                if (!valid.includes(ageRating)) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send();
                    return;
                }
            }
            let sql = `UPDATE film SET`
            if (title) {
                filters.push(` title = '${title}'`);
            }

            if (description) {
                filters.push(` description = '${description}'`);
            }

            if (releaseDate) {
                filters.push(` release_date = '${releaseDate}'`);
            }

            if (genreId) {
                filters.push(` genre_id = ${genreId}`);
            }

            if (runtime) {
                filters.push(` runtime = ${runtime}`);
            }

            if (ageRating) {
                filters.push(` age_rating = '${ageRating}'`);
            }
            if (filters.length > 0) {
                sql += ` ${filters.join(' , ')}`;
            }
            sql += ` WHERE id = ${id}`;
            await searchFilms(sql);
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteOne = async (req: Request, res: Response): Promise<void> => {

    try{
        const id = req.params.id;
        const token = req.header("X-Authorization");
        const result = await users.findUserIdByToken(token);
        if (result.length === 0) {
            res.statusMessage = 'Unauthorised';
            res.status(401).send();
            return;
        } else {
            if (isNaN(+id)) {
                res.statusMessage = "Bad Request";
                res.status(400).send("invalid");
                return;
            }
            const filmy = await film.getFilmById(+id);
            if (filmy.length === 0) {
                res.statusMessage = "Not Found. No film found with id";
                res.status(404).send();
                return;
            }

            if (filmy[0].director_id !== result[0].id) {
                res.statusMessage = "Forbidden. Only the director of the film can delete it";
                res.status(403).send();
                return;
            }
            await film.deleteFilm(+id);
            await film.deleteReview(+id);
            if (filmy[0].image_filename !== null) {
                const storagePath = path.join(__dirname, '../../../storage/images');
                const imagePath = path.join(storagePath, filmy[0].image_filename);
                fs.unlink(imagePath, (err: any) => {
                    if (err) {
                        res.statusMessage = "Internal server error";
                        res.status(500).send();
                    }
                });
            }
            res.statusMessage = "OK";
            res.status(200).send();
            return;

        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }

}


const getGenres = async (req: Request, res: Response): Promise<void> => {
    try{
        const genres = await film.getGenres();
        res.statusMessage = "OK";
        res.status(200).send(genres);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {viewAll, getOne, addOne, editOne, deleteOne, getGenres};