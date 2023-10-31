import { Client } from "@notionhq/client";

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export default defineComponent({
  props: {
    notion: {
      type: "app",
      app: "notion",
			description: `This workflow syncs new events in your chosen Notion database to your Google Calendar.\n\n**Instructions:**\n\n* Select the same Notion account and database that you selected in the trigger step.\n* Choose the Date property you want to use for event dates/times, as well as the Name property for your events.\n\n**Need help with this workflow? Check out the documentation here: https://thomasjfrank.com/notion-google-calendar-sync/**\n\nMore automations you may find useful:\n* [All My Notion Automations](https://thomasjfrank.com/notion-automations/)\n\nJoin my Notion Tips newsletter:\n* [Notion Tips Newsletter](https://thomasjfrank.com/fundamentals/#get-the-newsletter)`
    },
    databaseID: {
			type: "string",
			label: "Target Database",
			description: "Select the database from which you'd like to push new pages to Google Calendar.",
			async options({ query, prevContext }) {
				const notion = new Client({
					auth: this.notion.$auth.oauth_access_token,
				});

				let start_cursor = prevContext?.cursor;

				const response = await notion.search({
					...(query ? { query } : {}),
					...(start_cursor ? { start_cursor } : {}),
					page_size: 50,
					filter: {
						value: "database",
						property: "object",
					},
					sorts: [
						{
							direction: "descending",
							property: "last_edited_time",
						},
					],
				});

				const options = response.results.map((db) => ({
					label: db.title?.[0]?.plain_text,
					value: db.id,
				}));

				return {
					context: {
						cursor: response.next_cursor,
					},
					options,
				};
			},
			reloadProps: true,
		},
  },
	async additionalProps() {
		const notion = new Client({
			auth: this.notion.$auth.oauth_access_token,
		});

		const database = await notion.databases.retrieve({
			database_id: this.databaseID,
		});

		const properties = database.properties;

		const titleProps = Object.keys(properties).filter(
			(k) => properties[k].type === "title"
		);
		
		const dateProps = Object.keys(properties).filter(
			(k) => properties[k].type === "date"
		);

		const props = {
			eventName: {
				type: "string",
				label: "Event Name Property",
				description: "Select the title property for your events.",
				options: titleProps.map((prop) => ({ label: prop, value: prop })),
				optional: false,
			},
			eventDate: {
				type: "string",
				label: "Event Date Property",
				description: "Select the date property for your events. This property's value will be used to set the event date and time on your calendar.",
				options: dateProps.map((prop) => ({ label: prop, value: prop })),
				optional: false,
			},
		}

		return props
	},
	methods: {
		async addEventIDProperty() {
			const notion = new Client({
					auth: this.notion.$auth.oauth_access_token,
			});

			const database = await notion.databases.retrieve({
					database_id: this.databaseID,
			})

			// Check if the database has a property called "Google Event ID"
			const properties = database.properties;
			const propertyNames = Object.keys(properties)
			const hasGoogleEventID = propertyNames.includes("Google Event ID")
			if (!hasGoogleEventID) {
					// Create the Google Event ID property
					const response = await notion.databases.update({
							database_id: this.databaseID,
							properties: {
									"Google Event ID": {
											name: "Google Event ID",
											type: "rich_text",
											rich_text: {},
									},
							},
					})
			}

			return

		},
	},
  async run({ steps, $ }) {
    // Create the Google Event ID property in the user's db if it doesn't exist already
		await this.addEventIDProperty()
		
		let triggerProps
		let startDate
		let newEndDate

		// If there still isn't a date, exit the workflow 
		if(steps?.trigger?.event?.properties[this.eventDate]?.date?.start == null && steps?.trigger?.event?.properties[this.eventDate]?.date?.start == undefined){
      	console.log('No start date');
				$.flow.exit()
			return;
    }

		if (!steps?.trigger?.event?.properties[this.eventDate]?.date?.start) {
			// If no date is found, wait 30 seconds and then query the page once more.
			await sleep (20000)

			const notion = new Client({
					auth: this.notion.$auth.oauth_access_token,
			});

			const pageID = steps.trigger.event.id
			const response = await notion.pages.retrieve({ page_id: pageID})

			triggerProps = response.properties		
		} else {
			triggerProps = steps.trigger.event.properties
		}

		if(triggerProps[this.eventDate].date.end == null){
			startDate = new Date(triggerProps[this.eventDate].date.start);
			newEndDate = new Date;

			//if is an All-day event, end date receive start date value
			if(triggerProps[this.eventDate].date.start.length == 10){
				triggerProps[this.eventDate].date.end = triggerProps[this.eventDate].date.start;
			}
			//Define end date as two hours forward
			else {
				newEndDate.setTime(startDate.getTime() + 2 * 60 * 60 * 1000);
				triggerProps[this.eventDate].date.end = newEndDate;
			}
		}
		

		const eventProps = {
			name: triggerProps[this.eventName].title[0].text.content,
			start: triggerProps[this.eventDate].date.start,
			end: triggerProps[this.eventDate].date.end, //!== null ? triggerProps[this.eventDate].date.end : triggerProps[this.eventDate].date.start,
			link: `https://notion.so/${steps.trigger.event.id.replace(/-/g,"")}`
		}

		return eventProps
 
  },
})