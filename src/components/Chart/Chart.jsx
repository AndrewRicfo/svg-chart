import React, { Component } from "react";
import PropTypes from "prop-types";
import haikuLogo from "../../icons/logo.svg";
import chartTypes from "../../constants/chartTypes";

export default class Chart extends Component {
    constructor(props) {
        super(props);
        const { min, max, proportion } = this.getMinMax(props.charts);
        this.min = min;
        this.max = max;
        this.proportion = proportion;
        this.svgVerticalPadding = (20 / 1920) * window.innerWidth;
        this.svgHorizontalPadding = (55 / 1920) * window.innerWidth;
    }

    componentDidUpdate = prevProps => {
        if (prevProps.charts !== this.props.charts) {
            const { min, max, proportion } = this.getMinMax(this.props.charts);
            this.min = min;
            this.max = max;
            this.proportion = proportion;
        }

        if (prevProps.width !== this.props.width) {
            this.svgVerticalPadding = (20 / 1920) * window.innerWidth;
            this.svgHorizontalPadding = (55 / 1920) * window.innerWidth;
        }
    };

    getXCoordinates = () => {
        // 14 * 0.061 + 2 * 0.073 === 1
        // 25 * 0.036 + 2 * 0.05 === 1
        const { width, type } = this.props;
        const isFullYearType = chartTypes.FULL_YEAR === type;
        const coefficientForPadding = isFullYearType ? 0.073 : 0.05;
        const coefficientForColumn = isFullYearType ? 0.061 : 0.036;
        const colNumber = isFullYearType ? 16 : 27;

        const horizontalPadding = +(width * coefficientForPadding).toFixed(2);
        const coordinatesArray = [
            horizontalPadding,
            ...Array.from(
                { length: colNumber - 2 },
                () => width * coefficientForColumn
            ),
            horizontalPadding
        ];

        // we dont need to render the last one line because it's located exactly on svg right border,
        // only needed it for calculations
        coordinatesArray.pop();

        let prevCount = 0;

        return [
            ...coordinatesArray.map(
                (x, idx) => +parseFloat((prevCount += x)).toFixed(2)
            )
        ];
    };

    getMinMax = charts => {
        const { height } = this.props;
        let maxValue = -Infinity;
        let minValue = Infinity;

        charts.forEach(chart => {
            const totalUsCoordinates = chart.coordinates[0];
            totalUsCoordinates.points
                .concat(totalUsCoordinates.additionalPoints)
                .forEach(value => {
                    maxValue = Math.max(maxValue, value);
                    minValue = Math.min(minValue, value);
                });
        });

        let min = minValue;
        let max = maxValue;

        if (maxValue > 10) {
            max = maxValue + 8;
            min = Math.max(-0.1, minValue - 3);
        } else if (maxValue > 3) {
            max = maxValue + 2;
            min = Math.max(-0.1, minValue - 2);
        } else if (maxValue > 1) {
            max = maxValue + 1;
            min = Math.max(-0.1, minValue - 1);
        } else {
            max = 1.5;
            min = Math.max(-0.1, min - 1);
        }

        const proportion = height / (max - min + 1);
        return { min, max, proportion };
    };

    getCoordinates = (xCoordinates, { mainPoints, additionalPoints }) => {
        const { max, proportion } = this;
        const { type } = this.props;
        const isFullYearType = chartTypes.FULL_YEAR === type;
        const additionalCoordStartIdx = isFullYearType ? 11 : 22;

        return {
            mainCoordinates: mainPoints.map((value, index) => ({
                x: xCoordinates[index],
                y: proportion * (max - value) - this.svgVerticalPadding
            })),
            additionalCoordinates: additionalPoints.map((value, index) => ({
                x: xCoordinates[additionalCoordStartIdx + index],
                y: proportion * (max - value) - this.svgVerticalPadding
            }))
        };
    };

    getPath = ({ mainCoordinates, additionalCoordinates }) => {
        const { height } = this.props;
        const svgPointsMain = [];
        const svgPointsAdditional = [];
        mainCoordinates.forEach((point, i) => {
            if (i === 0) {
                // pseudo-predict before first point
                const nextPointsDiff =
                    mainCoordinates[1].y - mainCoordinates[0].y;
                svgPointsMain.push("M");
                svgPointsMain.push(this.svgHorizontalPadding);
                svgPointsMain.push(
                    Math.max(
                        Math.min(
                            point.y - nextPointsDiff,
                            height - this.svgVerticalPadding
                        ),
                        this.svgVerticalPadding
                    )
                );

                svgPointsMain.push("L");
                svgPointsMain.push(point.x);
                svgPointsMain.push(point.y);
            } else {
                svgPointsMain.push("L");
                svgPointsMain.push(point.x);
                svgPointsMain.push(point.y);
            }
        });

        additionalCoordinates.forEach((point, i) => {
            if (i === 0) {
                svgPointsAdditional.push("M");
                svgPointsAdditional.push(
                    mainCoordinates[mainCoordinates.length - 1].x
                );
                svgPointsAdditional.push(
                    mainCoordinates[mainCoordinates.length - 1].y
                );

                svgPointsAdditional.push("L");
                svgPointsAdditional.push(point.x);
                svgPointsAdditional.push(point.y);
            } else if (i === additionalCoordinates.length - 1) {
                svgPointsAdditional.push("L");
                svgPointsAdditional.push(point.x);
                svgPointsAdditional.push(point.y);

                // pseudo-predict after last point
                const previousPointsDiff =
                    additionalCoordinates[additionalCoordinates.length - 2].y -
                    additionalCoordinates[additionalCoordinates.length - 1].y;
                svgPointsAdditional.push("L");
                svgPointsAdditional.push(point.x + this.svgHorizontalPadding);
                svgPointsAdditional.push(
                    Math.max(
                        Math.min(
                            point.y - previousPointsDiff,
                            height - this.svgVerticalPadding
                        ),
                        this.svgVerticalPadding
                    )
                );
            } else {
                svgPointsAdditional.push("L");
                svgPointsAdditional.push(point.x);
                svgPointsAdditional.push(point.y);
            }
        });

        return {
            main: svgPointsMain.join(" "),
            additional: svgPointsAdditional.join(" ")
        };
    };

    renderMarkers = (charts, xCoordinates) => {
        return charts.map(({ coordinates: chartYCoordinates, color }) => {
            // ToDo: fix logic. now it renders TotalUS (first one) array of points
            const yCoordinates = {
                mainPoints: chartYCoordinates[0].points,
                additionalPoints: chartYCoordinates[0].additionalPoints
            };
            const coordinates = this.getCoordinates(xCoordinates, yCoordinates);
            const allCoordinates = coordinates.mainCoordinates.concat(
                coordinates.additionalCoordinates
            );

            return allCoordinates.map(({ x, y }, idx) => (
                <div
                    key={idx}
                    className="chart-markers__item"
                    style={{
                        left: x,
                        top: y,
                        color
                    }}
                />
            ));
        });
    };

    renderSvgLine = (charts, xCoordinates) => {
        return charts.map((chart, idx) => {
            // ToDo: fix logic. now it renders TotalUS (first one) array of points
            const yCoordinates = {
                mainPoints: chart.coordinates[0].points,
                additionalPoints: chart.coordinates[0].additionalPoints
            };
            const coordinates = this.getCoordinates(xCoordinates, yCoordinates);
            const pth = this.getPath(coordinates);

            return (
                <g key={idx}>
                    <path
                        className="svg__path"
                        strokeLinecap="round"
                        stroke={chart.color}
                        strokeWidth="3"
                        fill="none"
                        d={pth.main}
                    />
                    <path
                        className="svg__path"
                        strokeLinecap="round"
                        stroke={chart.color}
                        strokeWidth="3"
                        strokeDasharray="3 9"
                        fill="none"
                        d={pth.additional}
                    />
                </g>
            );
        });
    };

    renderSvgGrid = xCoordinates => {
        const { coefficient, height } = this.props;
        return xCoordinates.map((x, idx) => {
            const isLastMainLine = idx === xCoordinates.length - 5;
            const lineOpacity = isLastMainLine ? "0.7" : "0.6";
            const lastMainLineStyles = isLastMainLine
                ? {
                    transformOrigin: "center",
                    transform: "scaleY(2)"
                }
                : {};

            return (
                <line
                    key={idx}
                    x1={x}
                    x2={x}
                    y1={coefficient * 15}
                    y2={height}
                    stroke={`rgba(204,204,204,${lineOpacity})`}
                    strokeWidth={0.5}
                    strokeDasharray={isLastMainLine ? "0" : "2 11"}
                    style={lastMainLineStyles}
                />
            );
        });
    };

    renderYearLabels = xCoordinates => {
        const { startYear, type } = this.props;
        const isFullYear = type === chartTypes.FULL_YEAR;
        const classList = new Set([
            "chart-labels__item",
            !isFullYear ? "chart-labels__item--half-year" : ""
        ]);

        return xCoordinates.map((x, idx) => (
            <div
                key={idx}
                className={Array.from(classList).join(" ")}
                style={{ left: `${x}px` }}
            >
                {isFullYear ? startYear + idx : "pollovinka"}
            </div>
        ));
    };

    renderSvg = xCoordinates => {
        const { charts } = this.props;
        console.log('rnd')

        return (
            <svg
                version="1.2"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                className="svg"
            >
                <g id="grid">{this.renderSvgGrid(xCoordinates)}</g>
                <g id="charts">{this.renderSvgLine(charts, xCoordinates)}</g>
            </svg>
        );
    };

    render() {
        const { charts } = this.props;
        const xCoordinates = this.getXCoordinates();

        return (
            <div className="chart">
                <img
                    src={haikuLogo}
                    className="chart__haiku-logo"
                    style={{ left: `${xCoordinates[10]}px` }}
                    alt="haiku logo"
                />
                <div className="svg-wrap">{this.renderSvg(xCoordinates)}</div>
                <div className="chart-markers">
                    {this.renderMarkers(charts, xCoordinates)}
                </div>
                <div className="chart-labels">
                    {this.renderYearLabels(xCoordinates)}
                </div>
            </div>
        );
    }
}

Chart.propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
    coefficient: PropTypes.number,
    startYear: PropTypes.number,
    charts: PropTypes.arrayOf(
        PropTypes.shape({
            color: PropTypes.string,
            coordinates: PropTypes.array
        })
    ),
    type: PropTypes.number,
};
