import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { IUser, IRecord, UserModel, RecordModel } from './models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/angular_spa';
const FALLBACK_FILE = path.join(__dirname, '..', 'data_fallback.json');

// Interface defining the storage operations
export interface IStorageProvider {
  name: string;
  getUsers(): Promise<IUser[]>;
  getUserByUsername(username: string): Promise<IUser | null>;
  getUserById(id: string): Promise<IUser | null>;
  createUser(user: IUser): Promise<IUser>;
  updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null>;
  deleteUser(id: string): Promise<boolean>;
  
  getRecords(role: 'General User' | 'Admin', username: string): Promise<IRecord[]>;
  createRecord(record: IRecord): Promise<IRecord>;
}

// ----------------------------------------------------
// MongoDB/Mongoose Provider
// ----------------------------------------------------
class MongoStorageProvider implements IStorageProvider {
  name = 'MongoDB';

  async getUsers(): Promise<IUser[]> {
    const docs = await UserModel.find().select('-password');
    return docs.map(d => ({
      _id: d._id.toString(),
      username: d.username,
      role: d.role,
      createdAt: d.createdAt
    }));
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    const doc = await UserModel.findOne({ username });
    if (!doc) return null;
    return {
      _id: doc._id.toString(),
      username: doc.username,
      password: doc.password,
      role: doc.role,
      createdAt: doc.createdAt
    };
  }

  async getUserById(id: string): Promise<IUser | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;
    return {
      _id: doc._id.toString(),
      username: doc.username,
      role: doc.role,
      createdAt: doc.createdAt
    };
  }

  async createUser(user: IUser): Promise<IUser> {
    const doc = new UserModel(user);
    await doc.save();
    return {
      _id: doc._id.toString(),
      username: doc.username,
      role: doc.role,
      createdAt: doc.createdAt
    };
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const doc = await UserModel.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!doc) return null;
    return {
      _id: doc._id.toString(),
      username: doc.username,
      role: doc.role,
      createdAt: doc.createdAt
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    const res = await UserModel.findByIdAndDelete(id);
    return res !== null;
  }

  async getRecords(role: 'General User' | 'Admin', username: string): Promise<IRecord[]> {
    let query = {};
    if (role === 'General User') {
      // General User sees only their records and those that are marked as General User
      query = { owner: username, accessLevel: 'General User' };
    }
    // Admin sees everything
    const docs = await RecordModel.find(query);
    return docs.map(d => ({
      _id: d._id.toString(),
      title: d.title,
      description: d.description,
      category: d.category,
      value: d.value,
      owner: d.owner,
      accessLevel: d.accessLevel,
      createdAt: d.createdAt
    }));
  }

  async createRecord(record: IRecord): Promise<IRecord> {
    const doc = new RecordModel(record);
    await doc.save();
    return {
      _id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      value: doc.value,
      owner: doc.owner,
      accessLevel: doc.accessLevel,
      createdAt: doc.createdAt
    };
  }
}

// ----------------------------------------------------
// JSON File Fallback Provider
// ----------------------------------------------------
interface IJsonSchema {
  users: IUser[];
  records: IRecord[];
}

class JsonStorageProvider implements IStorageProvider {
  name = 'JSON File Fallback';

  private readData(): IJsonSchema {
    if (!fs.existsSync(FALLBACK_FILE)) {
      this.writeDefaultData();
    }
    try {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Failed to read JSON fallback database, re-initializing defaults...', err);
      return this.writeDefaultData();
    }
  }

  private writeData(data: IJsonSchema) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  private writeDefaultData(): IJsonSchema {
    const defaultData: IJsonSchema = {
      users: [
        { _id: 'u_admin', username: 'admin', password: 'admin123', role: 'Admin', createdAt: new Date() },
        { _id: 'u_user1', username: 'user1', password: 'user123', role: 'General User', createdAt: new Date() },
        { _id: 'u_user2', username: 'user2', password: 'user123', role: 'General User', createdAt: new Date() }
      ],
      records: [
        { _id: 'r1', title: 'Revenue Report Q1', description: 'Confidential Q1 corporate revenue breakdown.', category: 'Finance', value: 125000, owner: 'admin', accessLevel: 'Admin', createdAt: new Date() },
        { _id: 'r2', title: 'Server Infrastructure Cost', description: 'AWS and DevOps hosting expenses.', category: 'Operations', value: 45000, owner: 'admin', accessLevel: 'Admin', createdAt: new Date() },
        { _id: 'r3', title: 'Personal Expenses', description: 'Client lunch and taxi reimbursement.', category: 'Travel', value: 1200, owner: 'user1', accessLevel: 'General User', createdAt: new Date() },
        { _id: 'r4', title: 'Marketing Campaign Budget', description: 'Google Ads and social media promotions budget.', category: 'Marketing', value: 8000, owner: 'user1', accessLevel: 'General User', createdAt: new Date() },
        { _id: 'r5', title: 'Inventory Audit', description: 'Monthly physical inventory count adjustments.', category: 'Warehouse', value: 3200, owner: 'user2', accessLevel: 'General User', createdAt: new Date() }
      ]
    };
    this.writeData(defaultData);
    return defaultData;
  }

  async getUsers(): Promise<IUser[]> {
    const data = this.readData();
    return data.users.map(u => ({ _id: u._id, username: u.username, role: u.role, createdAt: u.createdAt }));
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    const data = this.readData();
    const u = data.users.find(x => x.username.toLowerCase() === username.toLowerCase());
    return u || null;
  }

  async getUserById(id: string): Promise<IUser | null> {
    const data = this.readData();
    const u = data.users.find(x => x._id === id);
    return u ? { _id: u._id, username: u.username, role: u.role, createdAt: u.createdAt } : null;
  }

  async createUser(user: IUser): Promise<IUser> {
    const data = this.readData();
    const newUser = {
      ...user,
      _id: 'u_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    data.users.push(newUser);
    this.writeData(data);
    return { _id: newUser._id, username: newUser.username, role: newUser.role, createdAt: newUser.createdAt };
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const data = this.readData();
    const index = data.users.findIndex(x => x._id === id);
    if (index === -1) return null;
    
    // Merge updates
    data.users[index] = {
      ...data.users[index],
      ...updates
    };
    
    this.writeData(data);
    const updated = data.users[index];
    return { _id: updated._id, username: updated.username, role: updated.role, createdAt: updated.createdAt };
  }

  async deleteUser(id: string): Promise<boolean> {
    const data = this.readData();
    const lengthBefore = data.users.length;
    data.users = data.users.filter(x => x._id !== id);
    this.writeData(data);
    return data.users.length < lengthBefore;
  }

  async getRecords(role: 'General User' | 'Admin', username: string): Promise<IRecord[]> {
    const data = this.readData();
    if (role === 'Admin') {
      return data.records;
    } else {
      // General User sees only their records that are General User
      return data.records.filter(r => r.owner === username && r.accessLevel === 'General User');
    }
  }

  async createRecord(record: IRecord): Promise<IRecord> {
    const data = this.readData();
    const newRecord = {
      ...record,
      _id: 'r_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    data.records.push(newRecord);
    this.writeData(data);
    return newRecord;
  }
}

// ----------------------------------------------------
// Database Manager
// ----------------------------------------------------
class DatabaseManager {
  private activeProvider: IStorageProvider;

  constructor() {
    // Default to JSON provider, will upgrade if Mongo connects
    this.activeProvider = new JsonStorageProvider();
  }

  async initialize(): Promise<IStorageProvider> {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    try {
      // Set short connection timeout (3 seconds) to fail-fast if local Mongo isn't running
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
      });
      
      console.log('MongoDB Connected successfully!');
      this.activeProvider = new MongoStorageProvider();
      
      // Initialize MongoDB with default records if empty
      await this.seedMongoIfEmpty();
    } catch (err: any) {
      console.warn('----------------------------------------------------');
      console.warn('WARNING: Failed to connect to MongoDB server.');
      console.warn(`Reason: ${err.message}`);
      console.warn('Falling back to local JSON file storage database...');
      console.warn(`Local file path: ${FALLBACK_FILE}`);
      console.warn('----------------------------------------------------');
      this.activeProvider = new JsonStorageProvider();
      
      // Initialize JSON store if needed
      await this.activeProvider.getUsers(); 
    }
    return this.activeProvider;
  }

  get provider(): IStorageProvider {
    return this.activeProvider;
  }

  private async seedMongoIfEmpty() {
    try {
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log('Seeding default users to MongoDB...');
        await UserModel.create([
          { username: 'admin', password: 'admin123', role: 'Admin' },
          { username: 'user1', password: 'user123', role: 'General User' },
          { username: 'user2', password: 'user123', role: 'General User' }
        ]);
      }
      
      const recordCount = await RecordModel.countDocuments();
      if (recordCount === 0) {
        console.log('Seeding default records to MongoDB...');
        await RecordModel.create([
          { title: 'Revenue Report Q1', description: 'Confidential Q1 corporate revenue breakdown.', category: 'Finance', value: 125000, owner: 'admin', accessLevel: 'Admin' },
          { title: 'Server Infrastructure Cost', description: 'AWS and DevOps hosting expenses.', category: 'Operations', value: 45000, owner: 'admin', accessLevel: 'Admin' },
          { title: 'Personal Expenses', description: 'Client lunch and taxi reimbursement.', category: 'Travel', value: 1200, owner: 'user1', accessLevel: 'General User' },
          { title: 'Marketing Campaign Budget', description: 'Google Ads and social media promotions budget.', category: 'Marketing', value: 8000, owner: 'user1', accessLevel: 'General User' },
          { title: 'Inventory Audit', description: 'Monthly physical inventory count adjustments.', category: 'Warehouse', value: 3200, owner: 'user2', accessLevel: 'General User' }
        ]);
      }
    } catch (err) {
      console.error('Error seeding MongoDB:', err);
    }
  }
}

export const dbManager = new DatabaseManager();
