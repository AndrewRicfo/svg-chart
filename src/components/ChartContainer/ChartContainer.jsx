import React, { Component, createRef } from "react";
import Chart from "../Chart";
import chartsData from "../../constants/charts";
import chartTypes from "../../constants/chartTypes";

export default class ChartContainer extends Component {
    constructor(props) {
        super(props);

        this.chartContainer = createRef();
        this.state = {
            chartSvgWidth: 0,
            chartSvgHeight: 0,
            chartCoefficient: 0,
            chartsData // in real app it will be somewhere in redux store
        };
    }

    componentDidMount() {
        this.calculateDimensions();
        window.addEventListener("resize", this.calculateDimensions);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.calculateDimensions);
    }

    calculateDimensions = () => {
        const headerHeight = 45;
        const chartStyles = getComputedStyle(this.chartContainer.current);
        const width = parseInt(chartStyles.width.replace("px", ""));
        const height = parseInt(
            chartStyles.height.replace("px", "") - headerHeight
        );
        const defaultChartWidth = 1350;

        this.setState({
            chartSvgWidth: width,
            chartSvgHeight: height,
            chartCoefficient: width / defaultChartWidth
        });
    };

    render() {
        const {
            chartSvgWidth,
            chartSvgHeight,
            chartCoefficient,
            chartsData
        } = this.state;

        return (
            <div ref={this.chartContainer} className="chart-container">
                {chartSvgWidth > 0 && (
                    <>
                        <div className="chart-header">
                            <div className="chart-header__link chart-header__link--active">
                                Penetration
                            </div>
                            <div
                                className="chart-header__link"
                                // onClick={() => {
                                    // this.setState({chartsData: this.state.chartsData.filter((chart, idx) => idx !== 0)})
                                // }}
                            >
                                Incidence
                            </div>
                            <div className="chart-header__link">Price</div>
                        </div>
                        <Chart
                            width={chartSvgWidth}
                            height={chartSvgHeight}
                            coefficient={chartCoefficient}
                            startYear={2008}
                            charts={chartsData}
                            type={chartTypes.FULL_YEAR}
                            // type={chartTypes.HALF_YEAR}
                        />
                    </>
                )}
            </div>
        );
    }
}
