import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'
import {getUserById} from "./user.server.model";
import * as querystring from "querystring";

const searchFilms = async (querystr: string): Promise<Film[]> => {
    Logger.info(`Searching films ...`);
    const conn = await getPool().getConnection();
    const query = `${querystr}`;
    const [ result ] = await conn.query (query);
    await conn.release();
    return result;

};

const addFilms = async (title: string, description: string, releaseDate: string, genreId: string, runtime: number, ageRating: string, directorId: number): Promise<ResultSetHeader> => {
    Logger.info(`Adding film ...`);
    const conn = await getPool().getConnection();
    const query = `insert into film ( title, description, release_date, genre_id, runtime, age_rating, director_id) values ( ?, ?, ?, ?, ?, ?, ?) `;
    const [ result ] = await conn.query (query, [title, description, releaseDate, genreId, runtime, ageRating, directorId]);
    await conn.release();
    return result;

};

const getFilmByTitle = async (title: string): Promise<Film[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `select * from film where title = ?`;
    const [ result ] = await conn.query (query, [title]);
    await conn.release();
    return result;
}

const getGenre = async (id: number): Promise<void[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `select * from genre where id = ?`;
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;
}

const getGenres = async (): Promise<void[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `select id as genreId, name from genre`;
    const [ result ] = await conn.query (query);
    await conn.release();
    return result;
}

const getFilmById = async (id: number): Promise<Film[]> => {
    Logger.info("Getting film by title ... ");
    const conn = await getPool().getConnection();
    const query = `select * from film where id = ?`;
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;
}

const deleteFilm = async (id: number): Promise<Film[]> => {
    Logger.info("Deleting film ... ");
    const conn = await getPool().getConnection();
    const query = `delete from film where id = ?`;
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;
}

const deleteReview = async (id: number): Promise<Film[]> => {
    Logger.info("Deleting film ... ");
    const conn = await getPool().getConnection();
    const query = `delete from film_review where film_id = ?`;
    const [ result ] = await conn.query (query, [id]);
    await conn.release();
    return result;
}
export {searchFilms, addFilms, getFilmByTitle, getGenre, getFilmById, deleteFilm, deleteReview, getGenres};