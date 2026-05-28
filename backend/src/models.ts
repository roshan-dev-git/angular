import { Schema, model, Document } from 'mongoose';

// User TypeScript interface
export interface IUser {
  _id?: string;
  username: string;
  password?: string;
  role: 'General User' | 'Admin';
  createdAt?: Date;
}

// User mongoose document type
export interface IUserDocument extends Document {
  username: string;
  password?: string;
  role: 'General User' | 'Admin';
  createdAt: Date;
}

// User schema
export const UserSchema = new Schema<IUserDocument>({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['General User', 'Admin'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = model<IUserDocument>('User', UserSchema);

// Record TypeScript interface
export interface IRecord {
  _id?: string;
  title: string;
  description: string;
  category: string;
  value: number;
  owner: string; // username
  accessLevel: 'General User' | 'Admin';
  createdAt?: Date;
}

// Record mongoose document type
export interface IRecordDocument extends Document {
  title: string;
  description: string;
  category: string;
  value: number;
  owner: string;
  accessLevel: 'General User' | 'Admin';
  createdAt: Date;
}

// Record schema
export const RecordSchema = new Schema<IRecordDocument>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  value: { type: Number, required: true },
  owner: { type: String, required: true, index: true },
  accessLevel: { type: String, enum: ['General User', 'Admin'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const RecordModel = model<IRecordDocument>('Record', RecordSchema);
