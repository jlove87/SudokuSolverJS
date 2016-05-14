import { Grid } from './Grid';
import { SolverState, SolverStateItem } from './SolverState';
import { Solution, NoSolution } from './Solution';
import { SolverUtility } from './SolverUtility';
import { GridSizeUtility } from './GridSizeUtility';

/**
 * Grid solver.
 */
export class Solver {
    private readonly _grid: Grid;
    private readonly _state: SolverState;
    
    /**
     * Creates a new Solver object.
     * @param {Grid} grid - The grid.
     */
    public constructor(grid: Grid) {
        // Validate the grid size.
        if(grid.gridSize.size > 32) {
            throw 'Grid is too large. Maxiumum grid size is 32x32';
        }
        
        this._grid = grid;
        this._state = SolverState.createFromGrid(grid);
    }
    
    /**
     * Gets the grid.
     * @return {Grid} The grid.
     */
    public get grid(): Grid {
        return this._grid;
    }
    
    /**
     * Attempts to solve the grid using the previous state (if one exists).
     * @param {boolean} log - True to log the output; False otherwise.
     * @return {Solution | undefined} A Solution object (if found); otherwise, undefined.
     */
    public nextSolution(): Solution | undefined {
        const grid = this._grid;
        const state = this._state;
        const complete = this._state.complete;
        
        // Check for completeness.
        // This can happen when the grid is complete upon load.
        if(state.boxes.currentValue === complete) {
            const solution = Solution.create(grid, state.items);
                
            // Revert the previous state (for the next solution...if any).
            state.pop();
            
            return solution;
        }
        
        let currentItem: SolverStateItem = state.pop();
        
        if(currentItem === undefined) {
            currentItem = this.getNextItem();
        }
        
        for(;;) {
            if(currentItem.boxCellValues === complete) {
                // No available values.
                // Return to previous state.
                currentItem = state.pop();
                
                if(currentItem === undefined) {
                    return undefined;
                }
                
                continue;
            }
            
            let stateChanged: boolean = false;
            
            // Try each available box cell value.
            for(currentItem.boxCellValue = this.getNextValue(currentItem.boxCellValues); 
                currentItem.boxCellValues !== complete; 
                currentItem.boxCellValues |= currentItem.boxCellValue, 
                currentItem.boxCellValue = this.getNextValue(currentItem.boxCellValues)) {
                
                // Keep track of the current permutation state.
                currentItem.boxCellValues |= currentItem.boxCellValue;
                
                state.push(currentItem);

                // Check for grid completeness.
                if(state.boxes.currentValue === complete) {
                    return Solution.create(grid, state.items);
                }
                
                stateChanged = true;
                
                currentItem = this.getNextItem();
                
                break;
            }
            
            // Check if nothing was found.
            if(!stateChanged && currentItem.boxCellValues === complete) {
                // Return to the previous state.
                currentItem = state.pop();
                
                if(currentItem === undefined) {
                    return undefined;
                }
            }
        }
    }
    
    /**
     * Gets the next solver state item.
     * @return {SolverStateItem} A SolverStateItem object.
     */
    private getNextItem(): SolverStateItem {
        let item = new SolverStateItem();
        
        item.box = this.getNextBox();
        item.boxCell = this.getNextBoxCell(item.box);
        item.column = SolverUtility.getColumnBitForBoxCell(item.box, item.boxCell, this._grid.gridSize);
        item.row = SolverUtility.getRowBitForBoxCell(item.box, item.boxCell, this._grid.gridSize);
        item.boxCellValues = this.getBoxCellValuesForItem(item);
        
        return item;
    }
    
    /**
     * Gets the next available value from the available box-cell values.
     * @param {number} values - The box-cell available values.
     * @return {number} The next value.
     */
    private getNextValue(values: number): number {
        return (values + 1) & ~values;
    }
    
    /**
     * Gets the next available box from the current state.
     * @return {number} The next box.
     */
    private getNextBox(): number {
        const boxes = this._state.boxes.currentValue;
        
        return (boxes + 1) & ~boxes;
    }
    
    /**
     * Gets the next available box-cell from the current state.
     * @param {number} box - The box.
     * @return {number} The next box-cell.
     */
    private getNextBoxCell(box: number): number {
        const boxCells = this._state.boxCells[box].currentValue;
        
        return (boxCells + 1) & ~boxCells;
    }
    
    /**
     * Gets the available box-cell values for a SolverStateItem.
     * @param {SolverStateItem} item - The state item.
     * @return {number} The available box-cell values.
     */
    private getBoxCellValuesForItem(item: SolverStateItem): number {
        const rowValues = this._state.rowValues[item.row].currentValue;
        const columnValues = this._state.columnValues[item.column].currentValue;
        const boxValues = this._state.boxValues[item.box].currentValue;
        
        return rowValues | columnValues | boxValues;
    }
}