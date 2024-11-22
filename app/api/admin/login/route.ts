import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    // Hardcoded admin credentials - in production these should be in a secure database
    const ADMIN_EMAIL = 'niranjanr753@gmail.com'
    const ADMIN_PASSWORD = 'admin@nimbu' 

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      return NextResponse.json({ token })
    }

    return NextResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}