import * as React from 'react';
import styled from "styled-components"
import { Motion, spring } from "react-motion"

const BarContainer = styled.div`
  width:150pt;
  position: relative;
  height: 12pt;
  background: lightgray;
`
const BarInnter = styled.div`
  display: block;
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 0;
  background-color: darkslateblue;
  text-align: center;
`
const BarCaption = styled.div`
  display: block;
  height: 8pt;
  width: 100%;
  font-size: 8pt;
  text-align: center;
`

const Bar = ({width}) => {
  return (
    <BarContainer>
      <BarInnter style={ {width: `${width}%`} } />
    </BarContainer>
  )
}

export default class ProgressBar extends React.Component {
  shouldComponentUpdate(nextProps){
    const { progress } = nextProps
    return !isNaN(parseInt(progress, 10))
  }
  render() {
    const progress = parseInt(this.props.progress, 10)
    return <Motion defaultStyle={{p: 0}} style={{p: spring(progress)}}>{ (value) => {
      return <div>
        <Bar width={value.p} />
        <BarCaption>{Math.ceil(value.p)}%</BarCaption>
      </div>
    }}</Motion>
  }
}
