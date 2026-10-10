import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import Loader from './Loader'

const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <Loader text="Authenticating..." />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute