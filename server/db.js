// The main purpose of this file is to provide an interface for database
// connection. Even though the code is quite simple and basically a tiny
// wrapper around mongoose package, it works as single point where
// database setup/config is performed and the interface provided here can be
// reused by both the main application and all tests which require database
// connection.

import Mongoose from 'mongoose';

// Holds the in-memory Mongo instance (local dev only) so `disconnect` can stop it.
let memoryServer;

const isLocalEnv = (config)=>{
	return config.get('local_environments').includes(config.get('node_env'));
};

// Local dev only, and only when no real DB URL was configured: boot an ephemeral,
// on-disk-backed (WiredTiger) MongoDB instance instead of requiring mongod to be
// installed/running. Lazily imported so the package isn't needed outside dev.
const getLocalInMemoryMongoDBURL = async ()=>{
	const { MongoMemoryServer } = await import('mongodb-memory-server');
	memoryServer = await MongoMemoryServer.create({
		instance : { storageEngine: 'wiredTiger' }
	});
	console.log('Started in-memory MongoDB instance for local development.');
	return memoryServer.getUri('homebrewery');
};

const getMongoDBURL = async (config)=>{
	const configuredUrl = config.get('mongodb_uri') || config.get('mongolab_uri');
	if(configuredUrl) return configuredUrl;

	if(isLocalEnv(config)) return await getLocalInMemoryMongoDBURL();

	return 'mongodb://127.0.0.1/homebrewery';  // changed from mongodb://localhost/homebrewery to accommodate versions 16+ of node.
};

const handleConnectionError = (error)=>{
	if(error) {
		console.error('Could not connect to a Mongo database: \n');
		console.error(error);
		console.error('\nIf you are running locally, make sure mongodb.exe is running and DB URL is configured properly');
		process.exit(1); // non-zero exit code to indicate an error
	}
};

const addListeners = (conn)=>{
	conn.connection.on('disconnecting', ()=>{console.log('Mongo disconnecting...');});
	conn.connection.on('disconnected', ()=>{console.log('Mongo disconnected!');});
	conn.connection.on('connecting', ()=>{console.log('Mongo connecting...');});
	conn.connection.on('connected', ()=>{console.log('Mongo connected!');});
	return conn;
};

const disconnect = async ()=>{
	await Mongoose.disconnect();
	if(memoryServer) {
		await memoryServer.stop();
		memoryServer = undefined;
	}
};

const connect = async (config)=>{
	const url = await getMongoDBURL(config);
	return await Mongoose.connect(url, {
		retryWrites : false,
		autoIndex   : isLocalEnv(config)
	})
	.then(addListeners(Mongoose))
	.catch((error)=>handleConnectionError(error));
};

export default {
	connect,
	disconnect
};

