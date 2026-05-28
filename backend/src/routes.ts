import { Router, Request, Response, NextFunction } from 'express';
import { dbManager } from './db';
import { IUser } from './models';

export const apiRouter = Router();

// Middleware to simulate network latency if requested in query params
const delayMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const delayParam = req.query.delay || req.headers['x-delay'];
  const delayMs = parseInt(delayParam as string, 10);
  
  if (delayMs && delayMs > 0) {
    console.log(`[Delay] Simulating slow network: sleeping for ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  next();
};

// Apply latency middleware to all GET endpoints (useful for logged in load simulations)
apiRouter.use(delayMiddleware);

// Simple Header-based Auth Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const username = req.headers['x-username'] as string;
  const role = req.headers['x-role'] as string;

  if (!username || !role) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-username or x-role headers.' });
  }
  next();
};

// Admin Guard Middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.headers['x-role'] as string;

  if (role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin role required for this operation.' });
  }
  next();
};

// ----------------------------------------------------
// Authentication Route
// ----------------------------------------------------
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  try {
    const provider = dbManager.provider;
    let user = await provider.getUserByUsername(username);

    if (user) {
      // User exists, verify password and role
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password. Please try again.' });
      }
      
      if (user.role !== role) {
        return res.status(400).json({ 
          error: `Account exists but role in database is '${user.role}' instead of selected '${role}'.` 
        });
      }
    } else {
      // User does not exist, auto-register (store) the user as requested
      console.log(`User '${username}' not found. Registering new '${role}' account...`);
      user = await provider.createUser({
        username,
        password,
        role
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error during login' });
  }
});

// ----------------------------------------------------
// Records Routes (filters based on access level)
// ----------------------------------------------------
apiRouter.get('/records', requireAuth, async (req: Request, res: Response) => {
  const username = req.headers['x-username'] as string;
  const role = req.headers['x-role'] as ('General User' | 'Admin');

  try {
    const provider = dbManager.provider;
    const records = await provider.getRecords(role, username);
    return res.status(200).json(records);
  } catch (err) {
    console.error('Error fetching records:', err);
    return res.status(500).json({ error: 'Internal Server Error fetching records' });
  }
});

// ----------------------------------------------------
// User Management Routes (Admin Only)
// ----------------------------------------------------
apiRouter.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const provider = dbManager.provider;
    const users = await provider.getUsers();
    return res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Internal Server Error fetching users' });
  }
});

apiRouter.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }

  try {
    const provider = dbManager.provider;
    const existing = await provider.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const newUser = await provider.createUser({ username, password, role });
    return res.status(201).json(newUser);
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ error: 'Internal Server Error creating user' });
  }
});

apiRouter.put('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  const { role, password } = req.body;

  try {
    const provider = dbManager.provider;
    const updates: Partial<IUser> = {};
    if (role) updates.role = role;
    if (password) updates.password = password;

    const updatedUser = await provider.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ error: 'Internal Server Error updating user' });
  }
});

apiRouter.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const provider = dbManager.provider;
    const success = await provider.deleteUser(id);
    if (!success) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Internal Server Error deleting user' });
  }
});
