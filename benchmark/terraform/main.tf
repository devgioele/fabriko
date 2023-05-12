# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.56.0"
    }
  }

  required_version = ">= 1.1.0"
}

provider "azurerm" {
  features {}
}

# Used to access the configuration of the AzureRM provider
data "azurerm_client_config" "current" {
}

resource "azurerm_resource_group" "rg_europe" {
  name     = "fabriko"
  location = "West Europe"
}

resource "azurerm_storage_account" "account_1" {
  name                     = "fabriko"
  resource_group_name      = azurerm_resource_group.rg_europe.name
  location                 = azurerm_resource_group.rg_europe.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}

resource "azurerm_storage_container" "container_1" {
  name                  = "content"
  storage_account_name  = azurerm_storage_account.account_1.name
  container_access_type = "private"
}

resource "azurerm_service_plan" "service_plan_1" {
  name                = "fabriko-mock"
  resource_group_name = azurerm_resource_group.rg_europe.name
  location            = azurerm_resource_group.rg_europe.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "function_app_1" {
  name                = "fabriko-mock-api"
  resource_group_name = azurerm_resource_group.rg_europe.name
  location            = azurerm_resource_group.rg_europe.location

  storage_account_name       = azurerm_storage_account.account_1.name
  storage_account_access_key = azurerm_storage_account.account_1.primary_access_key
  service_plan_id            = azurerm_service_plan.service_plan_1.id

  functions_extension_version = "~4"

  site_config {
    application_stack {
      node_version = 16
    }
  }
}

output "subscription-id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "client-id" {
  value = data.azurerm_client_config.current.client_id
}

output "tenant-id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "store-base-url" {
  value = azurerm_linux_function_app.function_app_1.default_hostname
}