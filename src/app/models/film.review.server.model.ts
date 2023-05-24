import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'
import {getUserById} from "./user.server.model";

const getReviews = async (id: number): Promise<Film[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `select film_review.user_id as reviewerId, first_name as reviewerFirstName, last_name as reviewerLastName, rating, review, timestamp from film_review join user on user_id = user.id where film_id = ? ORDER BY timestamp DESC`;
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;
};

const addReviews = async (filmId: number, userId : number, rating : number, review : string): Promise<Film[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `insert into film_review ( film_id, user_id, rating, review) values ( ?, ?, ?, ? )`;
    const [ result ] = await conn.query (query, [filmId, userId, rating, review]);
    await conn.release();
    return result;
};

export{getReviews, addReviews};