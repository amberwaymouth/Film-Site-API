import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'

const register = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    Logger.info(`Registering a new user in the database`);
    const conn = await getPool().getConnection();
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `insert into user ( email, first_name, last_name, password) values ( ?, ?, ?, ? )`;
    const [ result ] = await conn.query (query, [email, firstName, lastName, hashedPassword] );
    await conn.release();
    return result;
};

const findUserIdByToken = async (token: string): Promise<User[]> => {
    Logger.info(`Getting user from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where auth_token = ?';
    const [ rows ] = await conn.query( query, [ token ] );
    await conn.release();
    return rows;
};
const getOne = async (email: string): Promise<User[]> => {
    Logger.info(`Getting user ${email} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where email = ?';
    const [ rows ] = await conn.query( query, [ email ] );
    await conn.release();
    return rows;
};

const getUserById = async (id: number): Promise<User[]> => {
    Logger.info(`Getting user ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = `select * from user where id = ?`;
    const [ rows ] = await conn.query(query, [id]);
    return rows;
};

const login = async (email: string, password: string): Promise<ResultSetHeader[]> => {
    Logger.info("Logging in ... ");
    const randtoken = require ('rand-token');
    const token = randtoken.generate(16);
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = ? where email = ?';
    const[rows] = await conn.query(query, [token, email]);
    await conn.release();
    return rows;
}

const logout = async (token: string): Promise<ResultSetHeader[]> => {
    Logger.info("Logging out ... ");
    const conn = await getPool().getConnection();
    const email = (await (findUserIdByToken(token)))[0].email;
    const query = 'update user set auth_token = null where email = ?';
    const[rows] = await conn.query(query, [email]);
    await conn.release();
    return rows;
}

const updateEmail = async (email: string, userId: number): Promise<User[]> => {
    Logger.info("Updating email");
    const conn = await getPool().getConnection();
    const query = 'update user set email = ? where id = ?';
    const[rows] = await conn.query(query, [email, userId]);
    await conn.release();
    return rows;
}

const updateFirstName = async (firstName: string, userId: number): Promise<User[]> => {
    Logger.info("Updating email");
    const conn = await getPool().getConnection();
    const query = 'update user set first_name = ? where id = ?';
    const[rows] = await conn.query(query, [firstName, userId]);
    await conn.release();
    return rows;
}

const updateLastName = async (lastName: string, userId: number): Promise<User[]> => {
    Logger.info("Updating email");
    const conn = await getPool().getConnection();
    const query = 'update user set last_name = ? where id = ?';
    const[rows] = await conn.query(query, [lastName, userId]);
    await conn.release();
    return rows;
}

const updatePassword = async (password: string, userId: number): Promise<User[]> => {
    Logger.info("Updating password");
    const conn = await getPool().getConnection();
    const query = 'update user set password = ? where id = ?';
    const[rows] = await conn.query(query, [password, userId]);
    await conn.release();
    return rows;
}
export { register, getOne, login, findUserIdByToken, logout, getUserById, updateEmail, updateFirstName, updateLastName, updatePassword}