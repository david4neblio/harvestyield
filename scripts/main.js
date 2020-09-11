// The javascript code to interface with the Harvest NoMintRewardPool contract
// This is original code courtesy of david4neblio, please do not duplicate without credit

var contractAddress = "0x59258F4e15A5fC74A7284055A8094F58108dbD4f";
var apiKey = "PY7GX2IQE8Z2MXV13EHVZ6EJ43YQEW3KKC"; // API key to access Harvest.Finance contract on etherscan
var weiFactor = new BigNumber('1000000000000000000'); // 1e18
var donationAddress = "0xbb262Ed87154b7649A6899a43c5f5caaeB1Cfe52"

// Contract function hashes
var contract_rewardRate = "7b0a47ee";
var contract_periodFinished = "ebe2b12b";
var contract_totalSupply = "18160ddd";

// Contract Globals
var rewardRate = -1;
var totalSupply = -1;
var periodFinished = -1;
var farmPrice = -1;

$( document ).ready(function() {
    // This is ran when the page has fully loaded
    $("#donation_add").html(donationAddress);
});

function getRewardRate(){
	var url_https = "https://api.etherscan.io/api?module=proxy&action=eth_call&to="+contractAddress+"&data=0x"+contract_rewardRate+"&tag=latest&apikey="+apiKey;
	$.get( url_https, 
		function( data ) {
		if(data.result){
			// This should be hex formatted integer
			var eth_data = data.result.substring(2);
			var big_rate = new BigNumber('0x'+eth_data.substring(0,64));
			rewardRate = big_rate.div(weiFactor);
		}else{
			rewardRate = -1;
			alert("Failed to receive data from Etherscan");
		}
	});
}

function getTotalSupply(){
	var url_https = "https://api.etherscan.io/api?module=proxy&action=eth_call&to="+contractAddress+"&data=0x"+contract_totalSupply+"&tag=latest&apikey="+apiKey;
	$.get( url_https, 
		function( data ) {
		if(data.result){
			// This should be hex formatted integer
			var eth_data = data.result.substring(2);
			var big_supply = new BigNumber('0x'+eth_data.substring(0,64));
			totalSupply = big_supply.div(weiFactor);
		}else{
			totalSupply = -1;
			alert("Failed to receive data from Etherscan");
		}
	});	
}

function getPeriodFinished(){
	var url_https = "https://api.etherscan.io/api?module=proxy&action=eth_call&to="+contractAddress+"&data=0x"+contract_periodFinished+"&tag=latest&apikey="+apiKey;
	$.get( url_https, 
		function( data ) {
		if(data.result){
			// This should be hex formatted integer
			var eth_data = data.result.substring(2);
			periodFinished = new BigNumber('0x'+eth_data.substring(0,64));
		}else{
			periodFinished = -1;
			alert("Failed to receive data from Etherscan");
		}
	});	
}

function getFARMPrice(){
	var url_https = "https://api.coingecko.com/api/v3/simple/price?ids=harvest-finance&vs_currencies=usd";
	$.get( url_https, 
		function( data ) {
		if(data){
			// This should be hex formatted integer
			farmPrice = new BigNumber(data["harvest-finance"].usd);
		}else{
			farmPrice = -1;
			alert("Failed to receive data from CoinGecko");
		}
	});		
}

function startCalculateYield(){
	var farm_to_add = parseFloat($("#farm_to_add").val());
	var farm_in_pool = parseFloat($("#farm_in_pool").val());
	if(isNaN(farm_in_pool)){
		return;
	}
	if(isNaN(farm_to_add)){
		return;
	}
	if(farm_to_add < 0 || farm_in_pool < 0){
		return;
	}
	$("#request_button").html("Calculating...");
	$("#request_button").prop("disabled",true);
	$("#farm_to_add").prop("disabled",true);
	$("#farm_in_pool").prop("disabled",true);
	farmPrice = -1;
	obtainFARMValues();
	// Start the timer that waits for the values to be calculated
	window.setTimeout(checkFARMValuesLoaded,1000);
}

function obtainFARMValues(){
	getFARMPrice();
	getPeriodFinished();
	getTotalSupply();
	getRewardRate();
}

function checkFARMValuesLoaded(){
	if(farmPrice > 0 && periodFinished > 0 && totalSupply > 0 && rewardRate > 0){
		// Now calculate the yield and other values
		var farm_to_add = parseFloat($("#farm_to_add").val());
		var farm_in_pool = parseFloat($("#farm_in_pool").val());
		if(isNaN(farm_in_pool)){
			farm_in_pool = 0;
		}
		if(isNaN(farm_to_add)){
			farm_to_add = 0;
		}
		var invalid = false;
		if(totalSupply.lt(farm_in_pool) == true){
			// Farm in pool must be greater than what you claim is there
			alert("You've enter an invalid amount of FARM in pool, cannot be larger than pool size.");
			invalid = true;
		}
		if(farm_in_pool < 0 || farm_to_add < 0){
			invalid = true;
		}
		var currentTime = Date.now() / 1000.0; // Get current seconds in UTC
		var timeDiff = periodFinished.minus(currentTime);
		if(timeDiff > 0 && invalid == false){
			// This should be true
			var rewardLeft = rewardRate.multipliedBy(timeDiff); // The reward remaining in FARM
			var hoursLeft = timeDiff.div(60).div(60).dp(1); // Hours left rounded to 2 decimal places
			var poolProportion = new BigNumber(farm_in_pool + farm_to_add).div(totalSupply.plus(farm_to_add));
			var farmYield = poolProportion.multipliedBy(rewardLeft); // FARM earning
			var usdYield = farmYield.multipliedBy(farmPrice);
			var roi = farmYield.div(farm_to_add + farm_in_pool).multipliedBy(100).dp(4);

			// Now show the values
			$(".time_remain").html(hoursLeft.toString(10));
			$("#farm_price").html(farmPrice.toString(10));
			$("#pool_size").html(totalSupply.dp(4).toString(10));
			$("#pool_percent").html(poolProportion.multipliedBy(100).dp(4).toString(10))
			$("#distr_amount").html(rewardLeft.dp(4).toString(10));
			$("#farm_yield").html(farmYield.dp(8).toString(10));
			$("#usd_yield").html(usdYield.dp(2).toString(10));
			$("#roi_percent").html(roi.toString(10));
			$("#result_div").show();
		}else{
			$("#result_div").hide();
			if(invalid == false){
				alert("No expected yield on your FARM within the next 24 hours");
			}			
		}
		$("#request_button").html("Refresh");
		$("#request_button").prop("disabled",false);
		$("#farm_to_add").prop("disabled",false);
		$("#farm_in_pool").prop("disabled",false);
	}else{
		window.setTimeout(checkFARMValuesLoaded,1000); // Check again
	}
}