const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

const pool = new Pool({
  user: 'development',
  password: 'development',
  host: 'localhost',
  database: 'lightbnb',
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
  SELECT id, name, email, password
  FROM users
  WHERE email = $1;
  `
  const values = [email];
  
  return pool
  .query(queryString, values)
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT id, name, email, password
  FROM users
  WHERE id = $1;
  `
  const values = [id];
  
  return pool
  .query(queryString, values)
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {

  const { name, email, password } = user;

  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `
  const values = [name, email, password];
  
  return pool
  .query(queryString, values)
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
  SELECT reservations.id, properties.*, AVG(property_reviews.rating) AS average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY reservations.id, properties.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `
  const values = [guest_id, limit];
  
  return pool
  .query(queryString, values)
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  const values = [];
  const conditions = []

  if (options.city) {
    values.push(`%${options.city}%`);
    conditions.push(`properties.city LIKE $${values.length}`);
  }

  if (options.minimum_price_per_night) {
    values.push(options.minimum_price_per_night * 100);
    conditions.push(`properties.cost_per_night >= $${values.length}`);
  }

  if (options.maximum_price_per_night) {
    values.push(options.maximum_price_per_night * 100);
    conditions.push(`properties.cost_per_night <= $${values.length}`);
  }

  if (options.userId) {
    values.push(options.userId);
    conditions.push(`properties.owner_id = $${values.length}`);
  }

  if (conditions.length > 0) {
    queryString += ` WHERE ${conditions.join(' AND ')}`;
  }

  queryString += ` GROUP BY properties.id`;
  
  if (options.minimum_rating) {
    values.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) > $${values.length}`;
  }

  values.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${values.length};
  `;
  
  return pool
    .query(queryString, values)
    .then((result) => {
      // console.log(result.rows);
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
      return [];
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
