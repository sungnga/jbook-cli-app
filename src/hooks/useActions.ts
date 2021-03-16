import { useDispatch } from 'react-redux'
import { bindActionCreators } from 'redux'
import { actionCreators } from '../state'

export function useActions() {
  const dispatch = useDispatch()

  return bindActionCreators(actionCreators, dispatch)
}