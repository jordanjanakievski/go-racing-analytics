import type { Race } from "../types";

// Create a custom HTMLElement for race selection
export class RaceSelect extends HTMLElement {
    private races: Race[] = [];
    private select: HTMLSelectElement;

    constructor() {
        super();
        this.select = document.createElement("select");
        this.select.className = "race-select";
        this.select.addEventListener("change", this.handleChange.bind(this));
    }

    connectedCallback() {
        // Create the label
        const label = document.createElement("label");
        label.textContent = "Race:";
        label.setAttribute("for", "race-select");
        label.className = "race-select-label";

        // Create the wrapper div
        const wrapper = document.createElement("div");
        wrapper.className = "control-group";
        wrapper.appendChild(label);
        wrapper.appendChild(this.select);

        // Add help text
        const helpText = document.createElement("div");
        helpText.className = "driver-help";
        helpText.textContent = "Select a race to analyze";
        wrapper.appendChild(helpText);

        this.appendChild(wrapper);
    }

    // Update races data and refresh the select options
    updateRaces(races: Race[]) {
        this.races = races;
        this.refreshOptions();
    }

    // Get the currently selected race ID
    getSelectedRace(): string {
        return this.select.value;
    }

    // Set the selected race
    setSelectedRace(raceId: string) {
        this.select.value = raceId;
    }

    // Private method to refresh select options
    private refreshOptions() {
        // Clear existing options
        this.select.innerHTML = "";

        // Add placeholder option
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose a race...";
        placeholder.disabled = true;
        placeholder.selected = true;
        this.select.appendChild(placeholder);

        // Add race options
        this.races.forEach((race) => {
            const option = document.createElement("option");
            option.value = race.race_id;
            option.textContent = `${race.name} (${race.circuit})`;
            this.select.appendChild(option);
        });
    }

    // Handle change event
    private handleChange() {
        // Dispatch a custom event when selection changes
        const event = new CustomEvent("raceChange", {
            detail: { raceId: this.select.value },
            bubbles: true,
        });
        this.dispatchEvent(event);
    }
}

// Register the custom element
customElements.define("race-select", RaceSelect);
