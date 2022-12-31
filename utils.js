exports.miniCSV = {
	parse: (csv, delim) => {
		if (!delim) {
			delim = ","
		}
		var split = csv.split(delim)
		var cleanSplit = []
		for (var i = 0; i < split.length; i++) {
			cleanSplit.push(split[i].trim())
		}
		return cleanSplit
	},
	make: (arr, delim) => {
		if (!delim) {
			delim = ","
		}
		var newCSV = ""
		for (var i = 0; i < arr.length; i++) {
			if (i == arr.length-1) {
				//last iteration, no comma
				newCSV += `${arr[i]}`
			} else {
				newCSV += `${arr[i]},`
			}
		}
		return newCSV
	},
}