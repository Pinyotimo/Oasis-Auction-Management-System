import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io('http://localhost:5000')
    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  return socketRef
}